import { test as base, expect, type Page } from '@playwright/test'
import type { SeedResult } from '../scripts/seed.ts'

export { expect }

/**
 * Storage keys the app reads at startup. Kept here so a rename in the app fails
 * loudly in one place.
 */
export const STORAGE = {
  /** lib/theme.ts — absent means "follow the system", which Playwright emulates. */
  theme: 'flowpay.theme',
  /** features/auth/session-store.ts — email shown in the account menu. */
  lastEmail: 'flowpay.lastEmail',
  /** i18n/index.ts — chosen UI language. */
  language: 'flowpay.language',
} as const

export function seeded(): SeedResult {
  const raw = process.env.E2E_SEED
  if (!raw)
    throw new Error('E2E_SEED missing: run through `npm run e2e` / `npm run shots` (global setup seeds).')
  return JSON.parse(raw) as SeedResult
}

/**
 * Signs `page`'s browser context in through the API. Each context logs in on
 * its own: refresh tokens rotate, so a shared storage state would be revoked by
 * whichever test refreshed first.
 */
export async function signIn(page: Page) {
  const data = seeded()
  const res = await page.request.post('/api/v1/auth/login', {
    headers: { 'X-FlowPay-CSRF': '1' },
    data: { email: data.email, password: data.password },
  })
  expect(res.status(), 'API login').toBe(200)
  const { data: login } = (await res.json()) as { data: { user: { id: string; email: string } } }

  await page.addInitScript(
    ({ storage, user }) => {
      localStorage.setItem(storage.lastEmail, JSON.stringify({ userId: user.id, email: user.email }))
    },
    { storage: STORAGE, user: login.user },
  )
}

/** `authedPage`: a page whose context is signed in as the seeded merchant. */
export const test = base.extend<{ authedPage: Page }>({
  // Playwright's fixture callback; named `provide` so the React hooks lint rule
  // does not mistake it for React's `use`.
  authedPage: async ({ page }, provide) => {
    await signIn(page)
    await provide(page)
  },
})

/**
 * Registers and signs in a merchant of its own in `page`'s context. Returns its raw
 * test API key and a dashboard access token for direct API checks. For tests whose payments would otherwise reach the seeded
 * endpoints and change what other tests expect of them.
 */
export async function freshMerchant(page: Page, label: string) {
  const csrf = { 'X-FlowPay-CSRF': '1' }
  const email = `e2e-${label}+${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`
  const password = 'FlowPay-e2e-2026'
  const registered = await page.request.post('/api/v1/auth/register', {
    headers: csrf,
    data: { email, password, firstName: 'E2E', lastName: label, merchantName: `E2E ${label}` },
  })
  expect(registered.status(), 'register').toBe(201)
  // Login also sets the refresh cookie in this browser context, so the app restores the session.
  const login = await page.request.post('/api/v1/auth/login', { headers: csrf, data: { email, password } })
  expect(login.status(), 'login').toBe(200)
  const { data: session } = (await login.json()) as { data: { accessToken: string } }
  const key = await page.request.post('/api/v1/merchant/api-keys', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    data: { name: `E2E ${label}` },
  })
  expect(key.status(), 'api key').toBe(201)
  const apiKey = ((await key.json()) as { data: { key: string } }).data.key
  return { apiKey, accessToken: session.accessToken }
}

/** A succeeded payment through the Merchant API, which emits payment.succeeded. */
export async function succeededPayment(page: Page, apiKey: string) {
  const auth = { Authorization: `Bearer ${apiKey}` }
  const created = await page.request.post('/api/v1/payment-intents', {
    headers: { ...auth, 'Idempotency-Key': crypto.randomUUID() },
    data: { amount: 125000, currency: 'VND', orderId: `E2E-${Date.now()}`, description: 'Webhook E2E' },
  })
  expect(created.status(), 'create payment').toBe(201)
  const { data } = (await created.json()) as { data: { id: string } }
  const confirmed = await page.request.post(`/api/v1/payment-intents/${data.id}/confirm`, {
    headers: { ...auth, 'Idempotency-Key': crypto.randomUUID() },
  })
  expect(confirmed.status(), 'confirm payment').toBe(200)
  return data.id
}
