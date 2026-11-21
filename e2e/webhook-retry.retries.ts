import type { Locator, Page } from '@playwright/test'
import { startWebhookReceiver } from '../scripts/webhook-receiver.ts'
import { expect, freshMerchant, succeededPayment, test } from './fixtures'

/**
 * The full failure-and-recovery path against the real backend:
 * receiver answers 500 → automatic retries → DEAD → receiver fixed → manual retry →
 * DELIVERED, with Overview counting the dead delivery as retryable in between.
 *
 * Run with `npm run e2e:retries` against a backend started with short retry delays
 * (docs/local-stack.md), e.g. WEBHOOK_DELIVERY_RETRY_DELAYS=1s,1s,1s,1s,1s. With the
 * default schedule (10 s … 1 h) a delivery takes about 75 minutes to die, so the test
 * checks the delay first and stops with that instruction instead of waiting.
 */
const MAX_SHORT_DELAY_MS = 5_000

let receiver: ReturnType<typeof startWebhookReceiver>
test.beforeAll(() => {
  receiver = startWebhookReceiver({ port: 0, failWith: 500 })
})
test.afterAll(() => receiver.close())

interface DeliverySummary {
  id: string
  status: string
  attemptCount: number
  nextAttemptAt: string | null
  updatedAt: string
}

async function endpointDeliveries(page: Page, accessToken: string, endpointId: string) {
  const res = await page.request.get(`/api/v1/merchant/webhook-deliveries?endpointId=${endpointId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(res.status()).toBe(200)
  return ((await res.json()) as { data: DeliverySummary[] }).data
}

async function reloadUntilVisible(page: Page, target: Locator, timeout: number) {
  await expect(async () => {
    await page.reload()
    await expect(target).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout })
}

test('a dead delivery comes back with a manual retry once the receiver is fixed', async ({ page }) => {
  test.setTimeout(120_000)
  const port = await receiver.ready
  const { apiKey, accessToken } = await freshMerchant(page, 'retries')

  await page.goto('/developers/webhooks')
  await page.getByRole('button', { name: 'Add endpoint' }).click()
  const form = page.getByRole('dialog', { name: 'Add webhook endpoint' })
  await form.getByLabel('Endpoint URL').fill(`http://localhost:${port}/flowpay`)
  await form.getByRole('button', { name: 'Add endpoint' }).click()
  const created = page.getByRole('dialog', { name: 'Endpoint created' })
  await created.getByRole('button', { name: 'Show' }).click()
  receiver.setSecret((await created.locator('code').textContent())!.trim())
  await created.getByRole('button', { name: 'I’ve stored it' }).click()
  await expect(page).toHaveURL(/\/developers\/webhooks\/wep_\w+$/)
  const endpointId = page.url().split('/').pop()!

  await succeededPayment(page, apiKey)

  // The backend's retry delay, from its own schedule: fail fast on the default one.
  let first: DeliverySummary | undefined
  await expect(async () => {
    first = (await endpointDeliveries(page, accessToken, endpointId)).find(
      (d) => d.status === 'RETRYING' || d.status === 'DEAD',
    )
    expect(first).toBeDefined()
  }).toPass({ timeout: 30_000 })
  if (first!.status === 'RETRYING') {
    const delay = new Date(first!.nextAttemptAt!).getTime() - new Date(first!.updatedAt).getTime()
    expect(
      delay,
      'The backend uses long retry delays. Restart it with WEBHOOK_DELIVERY_RETRY_DELAYS=1s,1s,1s,1s,1s (docs/local-stack.md).',
    ).toBeLessThanOrEqual(MAX_SHORT_DELAY_MS)
  }

  // 1. Six automatic attempts, each answered 500 by a receiver that verified the signature.
  await reloadUntilVisible(
    page,
    page.getByRole('row').filter({ hasText: 'Dead' }).filter({ hasText: '6/6' }),
    60_000,
  )
  const failures = receiver.received.filter((r) => r.status === 500)
  expect(failures).toHaveLength(6)
  expect(failures.every((r) => r.verified)).toBe(true)
  expect(new Set(failures.map((r) => r.eventId)).size).toBe(1)

  // 2. Overview counts it as retryable and links straight to it.
  await page.goto('/')
  const deadRow = page.getByRole('link', { name: /dead webhook delivery you can retry/ })
  await expect(deadRow).toContainText('1')
  await deadRow.click()
  await expect(page).toHaveURL(new RegExp(`status=DEAD&endpointId=${endpointId}`))

  // 3. The sheet offers the retry; the receiver is fixed first.
  await page.getByRole('row').filter({ hasText: 'Dead' }).getByRole('cell').first().click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText('Automatic retries exhausted')).toBeVisible()
  await expect(sheet.getByText('6 attempts, none delivered')).toBeVisible()
  receiver.failWith(null)
  await sheet.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByText('Retry scheduled')).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Retry' })).toHaveCount(0)

  // 4. The sheet follows the delivery on its own until it is delivered by attempt 7.
  await expect(sheet.getByText('Delivered on attempt 7')).toBeVisible({ timeout: 30_000 })
  const seventh = sheet.getByRole('listitem').nth(6)
  await expect(seventh).toContainText('manual retry')
  await expect(seventh).toContainText('HTTP 204')
  expect(receiver.received.at(-1)).toMatchObject({
    verified: true,
    status: 204,
    eventId: failures[0]!.eventId,
  })

  // 5. Nothing left to retry.
  await page.goto('/')
  await expect(page.getByRole('link', { name: /dead webhook deliver(y|ies) you can retry/ })).toContainText(
    '0',
  )
})
