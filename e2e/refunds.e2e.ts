import type { Page } from '@playwright/test'
import { expect, freshMerchant, test } from './fixtures'

/**
 * Refunds against the real backend, each test on its own merchant. The dev
 * profile picks a refund's outcome from the amount's last digits like payments
 * (docs/local-stack.md §6): 901 declined, 902 unknown; anything else succeeds.
 */
async function paidPayment(page: Page, accessToken: string, amount: number) {
  const auth = { Authorization: `Bearer ${accessToken}` }
  const created = await page.request.post('/api/v1/merchant/payments', {
    headers: { ...auth, 'Idempotency-Key': crypto.randomUUID() },
    data: { amount, currency: 'VND', orderId: `E2E-REFUND-${Date.now().toString(36)}` },
  })
  expect(created.status(), 'create').toBe(201)
  const { data } = (await created.json()) as { data: { id: string } }
  const confirmed = await page.request.post(`/api/v1/merchant/payments/${data.id}/confirm`, {
    headers: { ...auth, 'Idempotency-Key': crypto.randomUUID() },
  })
  expect(confirmed.status(), 'confirm').toBe(200)
  return data.id
}

async function read(page: Page, accessToken: string, path: string) {
  const res = await page.request.get(`/api/v1/merchant${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(res.status()).toBe(200)
  return ((await res.json()) as { data: unknown }).data
}

interface PaymentState {
  status: string
  refundedAmount: number
  refundableAmount: number
}
interface RefundState {
  amount: number
  status: string
}

const refundDialog = (page: Page) => page.getByRole('dialog', { name: 'Refund payment' })

async function refund(page: Page, amount: string) {
  await page.getByRole('button', { name: 'Refund', exact: true }).click()
  const dialog = refundDialog(page)
  await dialog.getByLabel('Amount').fill(amount)
  await dialog.getByRole('button', { name: /^Refund \d/ }).click()
  await expect(dialog).toBeHidden()
}

test.describe('refunds', () => {
  // Sign-up, a paid payment and several refunds through the real backend.
  test.slow()

  test('two tabs refunding the whole payment at once: one refund, the other told why', async ({ page }) => {
    const { accessToken } = await freshMerchant(page, 'refund-race')
    const paymentId = await paidPayment(page, accessToken, 500000)
    const second = await page.context().newPage()

    for (const tab of [page, second]) {
      await tab.goto(`/payments/${paymentId}`)
      await tab.getByRole('button', { name: 'Refund', exact: true }).click()
      await expect(refundDialog(tab).getByRole('button', { name: 'Refund 500,000 VND' })).toBeVisible()
    }
    await Promise.all(
      [page, second].map((tab) =>
        refundDialog(tab).getByRole('button', { name: 'Refund 500,000 VND' }).click(),
      ),
    )

    // Each tab ends one way: its dialog closed (it won) or the conflict explained (it lost).
    const settle = (tab: Page) =>
      Promise.race([
        refundDialog(tab)
          .waitFor({ state: 'hidden' })
          .then(() => 'won'),
        refundDialog(tab)
          .getByText(/Nothing is left to refund/)
          .waitFor()
          .then(() => 'lost'),
      ])
    expect((await Promise.all([settle(page), settle(second)])).sort()).toEqual(['lost', 'won'])

    // The backend made exactly one refund for the whole amount.
    const refunds = (await read(page, accessToken, `/payments/${paymentId}/refunds`)) as RefundState[]
    expect(refunds).toEqual([expect.objectContaining({ amount: 500000, status: 'SUCCEEDED' })])
    expect(await read(page, accessToken, `/payments/${paymentId}`)).toMatchObject({
      status: 'REFUNDED',
      refundedAmount: 500000,
      refundableAmount: 0,
    })
  })

  test('identical partial refunds are two refunds; declined and unknown ones leave capacity right', async ({
    page,
  }) => {
    const { accessToken } = await freshMerchant(page, 'refund-flow')
    const paymentId = await paidPayment(page, accessToken, 500000)
    await page.goto(`/payments/${paymentId}`)

    // The same refund twice on purpose: a new key each time, so two refunds.
    await refund(page, '100000')
    await expect(page.getByText('Refunded 100,000 VND').first()).toBeVisible()
    await refund(page, '100000')
    const rows = page.getByRole('row').filter({ hasText: '100,000' })
    await expect(rows).toHaveCount(2)

    // Declined (901): reported as failed, capacity untouched.
    await refund(page, '100901')
    await expect(page.getByText('Refund failed · 100,901 VND')).toBeVisible()

    // Unknown (902): reserved while processing.
    await refund(page, '100902')
    await expect(page.getByText('Refund outcome unknown')).toBeVisible()

    const payment = (await read(page, accessToken, `/payments/${paymentId}`)) as PaymentState
    expect(payment).toMatchObject({
      status: 'PARTIALLY_REFUNDED',
      refundedAmount: 200000,
      refundableAmount: 500000 - 200000 - 100902,
    })
    const refunds = (await read(page, accessToken, `/payments/${paymentId}/refunds`)) as RefundState[]
    expect(refunds.map((r) => `${r.amount} ${r.status}`).sort()).toEqual([
      '100000 SUCCEEDED',
      '100000 SUCCEEDED',
      '100901 FAILED',
      '100902 PROCESSING',
    ])

    // The processing refund explains itself where it is opened.
    await page.getByRole('row').filter({ hasText: '100,902' }).getByRole('cell').first().click()
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByText('Waiting for the provider’s outcome')).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'Check again' })).toBeVisible()
  })
})
