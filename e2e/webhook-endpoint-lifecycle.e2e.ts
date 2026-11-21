import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/**
 * Rotation and disabling against the real backend. The endpoint points at a closed
 * local port (the dev backend allows http://localhost), so its delivery fails and
 * retries without anything leaving the machine.
 *
 * Each test signs up its own merchant: the payment it creates would otherwise also
 * reach the seeded endpoints and change what other tests expect of them.
 */
async function freshMerchant(page: Page) {
  const csrf = { 'X-FlowPay-CSRF': '1' }
  const email = `e2e-lifecycle+${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`
  const password = 'FlowPay-e2e-2026'
  const registered = await page.request.post('/api/v1/auth/register', {
    headers: csrf,
    data: { email, password, firstName: 'Webhook', lastName: 'Lifecycle', merchantName: 'Lifecycle Store' },
  })
  expect(registered.status(), 'register').toBe(201)
  // Login also sets the refresh cookie in this browser context, so the app restores the session.
  const login = await page.request.post('/api/v1/auth/login', { headers: csrf, data: { email, password } })
  expect(login.status(), 'login').toBe(200)
  const { data: session } = (await login.json()) as { data: { accessToken: string } }
  const key = await page.request.post('/api/v1/merchant/api-keys', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    data: { name: 'E2E lifecycle' },
  })
  expect(key.status(), 'api key').toBe(201)
  return ((await key.json()) as { data: { key: string } }).data.key
}

async function createEndpoint(page: Page, url: string) {
  await page.goto('/developers/webhooks')
  await page.getByRole('button', { name: 'Add endpoint' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add webhook endpoint' })
  await dialog.getByLabel('Endpoint URL').fill(url)
  await dialog.getByRole('button', { name: 'Add endpoint' }).click()
  await page
    .getByRole('dialog', { name: 'Endpoint created' })
    .getByRole('button', { name: 'I’ve stored it' })
    .click()
  await expect(page).toHaveURL(/\/developers\/webhooks\/wep_\w+$/)
}

/** A succeeded payment through the Merchant API, which emits payment.succeeded. */
async function succeededPayment(page: Page, apiKey: string) {
  const auth = { Authorization: `Bearer ${apiKey}` }
  const created = await page.request.post('/api/v1/payment-intents', {
    headers: { ...auth, 'Idempotency-Key': crypto.randomUUID() },
    data: {
      amount: 125000,
      currency: 'VND',
      orderId: `E2E-LIFECYCLE-${Date.now()}`,
      description: 'Webhook lifecycle',
    },
  })
  expect(created.status()).toBe(201)
  const { data } = (await created.json()) as { data: { id: string } }
  const confirmed = await page.request.post(`/api/v1/payment-intents/${data.id}/confirm`, {
    headers: { ...auth, 'Idempotency-Key': crypto.randomUUID() },
  })
  expect(confirmed.status()).toBe(200)
}

test('rotating the secret shows the new one once', async ({ page }) => {
  await freshMerchant(page)
  await createEndpoint(page, `http://localhost:9/rotate-${Date.now().toString(36)}`)

  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Rotate signing secret' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Rotate signing secret?' })
  await expect(confirm.getByText(/there is no grace period/)).toBeVisible()
  await confirm.getByRole('button', { name: 'Rotate secret' }).click()

  const reveal = page.getByRole('dialog', { name: 'New signing secret' })
  await expect(reveal.getByText('Signing secret', { exact: true })).toBeVisible()
  await reveal.getByRole('button', { name: 'I’ve stored it' }).click()
  await expect(reveal).toBeHidden()
})

test('disabling cancels the retrying delivery and cannot be undone', async ({ page }) => {
  // Waits for the outbox relay, the webhook consumer and one failed attempt.
  test.slow()
  const apiKey = await freshMerchant(page)
  await createEndpoint(page, `http://localhost:9/disable-${Date.now().toString(36)}`)
  await succeededPayment(page, apiKey)

  const waiting = page.getByRole('row').filter({ hasText: /Pending|Delivering|Retrying/ })
  await expect(async () => {
    await page.reload()
    await expect(waiting.first()).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 45_000 })

  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Disable endpoint' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Disable this endpoint?' })
  await expect(confirm.getByText(/cannot be re-enabled/)).toBeVisible()
  await expect(confirm.getByText('1 delivery still waiting or retrying will be marked dead.')).toBeVisible()
  await confirm.getByRole('button', { name: 'Disable endpoint' }).click()

  await expect(page.getByText('This endpoint is disabled')).toBeVisible()
  await expect(page.getByRole('button', { name: 'More actions' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  // The backend marked the cancelled delivery DEAD (ENDPOINT_DISABLED).
  await expect(async () => {
    await page.reload()
    await expect(page.getByRole('row').filter({ hasText: 'Dead' }).first()).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 20_000 })
  await expect(waiting).toHaveCount(0)
})
