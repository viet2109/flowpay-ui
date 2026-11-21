import { readFileSync } from 'node:fs'
import type { Locator, Page } from '@playwright/test'
import { startWebhookReceiver } from '../scripts/webhook-receiver.ts'
import { expect, freshMerchant, succeededPayment, test } from './fixtures'

/**
 * The signature guide against real deliveries: a local receiver verifies every
 * request with the very code the endpoint page shows (verify-signature.js), using
 * only the secret the dashboard revealed. Runs on its own merchant so its payments
 * never reach the seeded endpoints.
 */
const SAMPLE = readFileSync(
  new URL('../src/features/webhooks/signature/verify-signature.js', import.meta.url),
  'utf8',
)

let receiver: ReturnType<typeof startWebhookReceiver>
test.beforeAll(() => {
  receiver = startWebhookReceiver({ port: 0 })
})
test.afterAll(() => receiver.close())

/** Reads a one-time secret from its SecretReveal (unmasked with Show). */
async function revealedSecret(dialog: Locator) {
  await dialog.getByRole('button', { name: 'Show' }).click()
  const secret = (await dialog.locator('code').textContent())?.trim() ?? ''
  expect(secret).toMatch(/^whsec_\S+$/)
  return secret
}

const deliveryRow = (page: Page, status: string, http: number) =>
  page
    .getByRole('row')
    .filter({ hasText: status })
    .filter({ hasText: `HTTP ${http}` })

async function reloadUntilVisible(page: Page, row: Locator, timeout: number) {
  await expect(async () => {
    await page.reload()
    await expect(row.first()).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout })
}

test('the guide’s code verifies real deliveries, and only with the current secret', async ({ page }) => {
  // Outbox relay, consumer and one automatic retry (10 s base delay + up to 20% jitter).
  test.slow()
  const port = await receiver.ready
  const apiKey = await freshMerchant(page, 'signature')

  await page.goto('/developers/webhooks')
  await page.getByRole('button', { name: 'Add endpoint' }).click()
  const form = page.getByRole('dialog', { name: 'Add webhook endpoint' })
  await form.getByLabel('Endpoint URL').fill(`http://localhost:${port}/flowpay`)
  await form.getByRole('button', { name: 'Add endpoint' }).click()
  const created = page.getByRole('dialog', { name: 'Endpoint created' })
  receiver.setSecret(await revealedSecret(created))
  await created.getByRole('button', { name: 'I’ve stored it' }).click()
  await expect(page).toHaveURL(/\/developers\/webhooks\/wep_\w+$/)

  // The page shows the exact file the receiver runs.
  expect(await page.locator('pre code').textContent()).toBe(SAMPLE)

  // 1. Signed with the secret from creation: verified, acknowledged, delivered.
  await succeededPayment(page, apiKey)
  await expect
    .poll(() => receiver.received.filter((r) => r.verified && r.eventType === 'payment.succeeded').length, {
      timeout: 30_000,
    })
    .toBe(1)
  await reloadUntilVisible(page, deliveryRow(page, 'Delivered', 204), 15_000)

  // 2. After a rotation the old secret no longer verifies: no grace period.
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('menuitem', { name: 'Rotate signing secret' }).click()
  await page
    .getByRole('alertdialog', { name: 'Rotate signing secret?' })
    .getByRole('button', { name: 'Rotate secret' })
    .click()
  const reveal = page.getByRole('dialog', { name: 'New signing secret' })
  const rotated = await revealedSecret(reveal)
  await reveal.getByRole('button', { name: 'I’ve stored it' }).click()

  const before = receiver.received.length
  await succeededPayment(page, apiKey)
  await expect
    .poll(() => receiver.received.slice(before).find((r) => !r.verified)?.status, { timeout: 30_000 })
    .toBe(401)
  const rejected = receiver.received.slice(before).find((r) => !r.verified)!
  await reloadUntilVisible(page, deliveryRow(page, 'Retrying', 401), 15_000)

  // 3. With the new secret in the receiver, FlowPay's retry of the same event verifies.
  receiver.setSecret(rotated)
  await expect
    .poll(() => receiver.received.some((r) => r.verified && r.eventId === rejected.eventId), {
      timeout: 45_000,
    })
    .toBe(true)
  await reloadUntilVisible(page, deliveryRow(page, 'Delivered', 204).nth(1), 15_000)
  await expect(page.getByRole('row').filter({ hasText: 'Retrying' })).toHaveCount(0)
})
