import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** The create dialog's words in each UI language (i18n/{en,vi}/payments.ts). */
const COPY = {
  en: { open: 'New test payment', currency: 'Currency', amount: 'Amount', submit: 'Create payment' },
  vi: { open: 'Tạo thanh toán test', currency: 'Tiền tệ', amount: 'Số tiền', submit: 'Tạo thanh toán' },
} as const

/** Opens "New test payment" with USD selected, in the given UI language. */
async function openCreatePayment(page: Page, language: 'vi' | 'en') {
  const copy = COPY[language]
  await page.addInitScript((lng) => localStorage.setItem('flowpay.language', lng), language)
  await page.goto('/payments')
  await page.getByRole('button', { name: copy.open }).click()
  const dialog = page.getByRole('dialog', { name: copy.open })
  await dialog.getByLabel(copy.currency).selectOption('USD')
  // Confirmation is irrelevant here; leave the payment in CREATED.
  await dialog.getByRole('checkbox').uncheck()
  return { dialog, copy }
}

test('a Vietnamese amount reaches the API as the right minor units', async ({ authedPage: page }) => {
  const { dialog, copy } = await openCreatePayment(page, 'vi')
  await dialog.getByLabel(copy.amount).fill('1.250,50')
  await expect(dialog.getByText('= 1.250,50 USD · 125.050 đơn vị nhỏ nhất')).toBeVisible()

  const request = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().endsWith('/api/v1/merchant/payments'),
  )
  await dialog.getByRole('button', { name: copy.submit, exact: true }).click()
  expect((await request).postDataJSON()).toMatchObject({ amount: 125050, currency: 'USD' })
})

test('an ambiguous amount is rejected instead of being read 100x too large', async ({ authedPage: page }) => {
  const { dialog, copy } = await openCreatePayment(page, 'en')
  let sent = false
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/v1/merchant/payments')) sent = true
  })

  await dialog.getByLabel(copy.amount).fill('12,50')
  await dialog.getByRole('button', { name: copy.submit }).click()

  await expect(dialog.getByText('Not a valid USD amount. Write it like 12,345.67.')).toBeVisible()
  expect(sent).toBe(false)
})
