import type { Page, Route } from '@playwright/test'
import { expect as baseExpect, seeded, signIn, test } from './fixtures'

// These tests load the whole app several times, in several tabs at once, on the
// dev server (which recompiles changed modules on first request): be patient.
const expect = baseExpect.configure({ timeout: 30_000 })

/**
 * Session lifecycle in a real browser: several tabs of one context share the
 * refresh cookie, like a person's browser. Paths the local backend cannot
 * produce on demand (offline, 429, suspended merchant, refused refresh) are
 * answered by Playwright routes with the backend's Problem Details shape.
 */
const REFRESH = '**/api/v1/auth/refresh'
const overview = (page: Page) =>
  expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()

const problem = (route: Route, status: number, code: string, headers: Record<string, string> = {}) =>
  route.fulfill({
    status,
    headers: { 'Content-Type': 'application/problem+json', ...headers },
    body: JSON.stringify({ status, code, requestId: 'req_e2e' }),
  })

test.describe('session', () => {
  test.slow() // several full app loads per test on the dev server

  test('two tabs restoring at the same time both stay signed in', async ({ page, context }) => {
    await signIn(page)
    const second = await context.newPage()
    await page.goto('/')
    await second.goto('/')
    await overview(page)
    await overview(second)

    // Widen the race: each refresh takes 400 ms, so both restores overlap.
    const statuses: number[] = []
    await context.route(REFRESH, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400))
      const response = await route.fetch()
      statuses.push(response.status())
      await route.fulfill({ response })
    })
    await Promise.all([page.reload(), second.reload()])

    await overview(page)
    await overview(second)
    // A rotated token presented twice would come back 401 REFRESH_TOKEN_REVOKED.
    expect(statuses.length).toBeGreaterThan(0)
    expect(statuses.every((s) => s === 200)).toBe(true)
  })

  test('signing out in one tab signs out the others', async ({ page, context }) => {
    await signIn(page)
    const second = await context.newPage()
    await page.goto('/')
    await second.goto('/developers/api-keys')
    await overview(page)
    // The second tab must have restored its session before the sign-out happens.
    await expect(second.getByRole('heading', { level: 1, name: 'API keys' })).toBeVisible()

    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()

    await expect(second).toHaveURL(/\/login$/)
    await expect(second.getByText('You signed out in another tab.')).toBeVisible()
  })

  test('signing in in one tab opens the dashboard in the others', async ({ page, context }) => {
    const second = await context.newPage()
    await page.goto('/login')
    await second.goto('/login')
    const { email, password } = seeded()
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await overview(page)
    await overview(second)
  })

  test('a refused session returns to sign-in, then back to the same page', async ({ page }) => {
    await signIn(page)
    await page.goto('/developers/webhooks')
    await expect(page.getByRole('heading', { level: 1, name: 'Webhooks' })).toBeVisible()

    // The server now refuses both the access token and the refresh token.
    await page.route(REFRESH, (route) => problem(route, 401, 'REFRESH_TOKEN_EXPIRED'))
    await page.route(
      (url) => url.pathname.startsWith('/api/v1/merchant'),
      (route) => problem(route, 401, 'AUTHENTICATION_REQUIRED'),
    )
    // The delivery list is not cached yet, so opening it asks the server.
    await page.getByRole('navigation', { name: 'Webhooks' }).getByRole('link', { name: 'Deliveries' }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByText('Your session ended. Sign in again to continue where you were.'),
    ).toBeVisible()

    await page.unrouteAll()
    const { email, password } = seeded()
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/developers\/webhooks\/deliveries$/)
  })

  test('an unreachable backend at start-up is not treated as signed out', async ({ page }) => {
    await signIn(page)
    await page.route(REFRESH, (route) => route.abort('connectionrefused'))
    await page.goto('/developers/api-keys')

    await expect(page.getByRole('heading', { name: 'FlowPay is not answering' })).toBeVisible()
    await expect(page.getByText('Cannot reach FlowPay.')).toBeVisible()
    await expect(page).not.toHaveURL(/\/login/)

    await page.unrouteAll()
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'API keys' })).toBeVisible()
  })

  test('a 429 at start-up says how long to wait and keeps the session', async ({ page }) => {
    await signIn(page)
    await page.route(REFRESH, (route) => problem(route, 429, 'RATE_LIMIT_EXCEEDED', { 'Retry-After': '30' }))
    await page.goto('/')

    await expect(page.getByText('Too many requests. Try again in 30 seconds.')).toBeVisible()
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('a suspended merchant is explained once, at the top', async ({ page }) => {
    await signIn(page)
    await page.route('**/api/v1/merchant', (route) =>
      route.request().method() === 'GET' ? problem(route, 403, 'MERCHANT_SUSPENDED') : route.continue(),
    )
    await page.goto('/')
    await expect(page.getByRole('alert').filter({ hasText: 'This merchant is suspended.' })).toBeVisible()
  })
})
