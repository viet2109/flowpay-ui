import { expect, freshMerchant, test } from './fixtures'

/**
 * A confirmation that succeeded on the server while its response was lost: the
 * dialog keeps the created payment, and "Retry confirmation" reuses the same
 * Idempotency-Key, so the backend replays the first result instead of charging
 * again. Runs on its own merchant.
 */
test('a lost confirm response is retried with the same key and replayed, not charged twice', async ({
  page,
}) => {
  test.slow()
  const { accessToken } = await freshMerchant(page, 'create')
  const orderId = `E2E-LOST-${Date.now().toString(36)}`
  await page.goto('/payments')

  // The first confirm reaches the backend, but the browser gets a network error.
  const confirmKeys: string[] = []
  let first = true
  await page.route('**/api/v1/merchant/payments/*/confirm', async (route) => {
    confirmKeys.push(route.request().headers()['idempotency-key'] ?? '')
    if (!first) return route.continue()
    first = false
    await route.fetch()
    await route.abort('connectionreset')
  })

  await page.getByRole('button', { name: 'New test payment' }).click()
  const dialog = page.getByRole('dialog', { name: 'New test payment' })
  await dialog.getByLabel('Amount').fill('125000')
  await dialog.getByLabel('Order ID').fill(orderId)
  await dialog.getByRole('button', { name: 'Create payment' }).click()

  await expect(dialog.getByText('Payment created, but not confirmed')).toBeVisible()
  await expect(dialog.getByText('Cannot reach FlowPay.', { exact: false })).toBeVisible()
  await expect(dialog.getByLabel('Amount')).toHaveCount(0)

  const replayed = page.waitForResponse((r) => r.url().endsWith('/confirm'))
  await dialog.getByRole('button', { name: 'Retry confirmation' }).click()
  expect((await replayed).headers()['idempotency-replayed']).toBe('true')
  await expect(page.getByText('Payment succeeded · 125,000 VND')).toBeVisible()
  await expect(page.getByText('Replayed: this is the result of the first confirmation.')).toBeVisible()
  expect(confirmKeys).toHaveLength(2)
  expect(confirmKeys[1]).toBe(confirmKeys[0])

  // One payment for the order, succeeded with a single provider attempt.
  const auth = { Authorization: `Bearer ${accessToken}` }
  const list = await page.request.get(`/api/v1/merchant/payments?orderId=${orderId}`, { headers: auth })
  const payments = ((await list.json()) as { data: { id: string; status: string }[] }).data
  expect(payments).toHaveLength(1)
  expect(payments[0]!.status).toBe('SUCCEEDED')
  const attempts = await page.request.get(`/api/v1/merchant/payments/${payments[0]!.id}/transactions`, {
    headers: auth,
  })
  expect(((await attempts.json()) as { data: unknown[] }).data).toHaveLength(1)
})
