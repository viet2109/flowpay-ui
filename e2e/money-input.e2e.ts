import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** Opens "New test payment" with USD selected, in the given UI language. */
async function openCreatePayment(page: Page, language: 'vi' | 'en') {
  await page.addInitScript((lng) => localStorage.setItem('flowpay.language', lng), language)
  await page.goto('/payments')
  await page.getByRole('button', { name: 'New test payment' }).click()
  const dialog = page.getByRole('dialog', { name: 'New test payment' })
  await dialog.getByLabel('Currency').selectOption('USD')
  // Confirmation is irrelevant here; leave the payment in CREATED.
  await dialog.getByRole('checkbox').uncheck()
  return dialog
}

test('a Vietnamese amount reaches the API as the right minor units', async ({ authedPage: page }) => {
  const dialog = await openCreatePayment(page, 'vi')
  await dialog.getByLabel('Amount').fill('1.250,50')
  await expect(dialog.getByText('= 1.250,50 USD · 125.050 minor units')).toBeVisible()

  const request = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().endsWith('/api/v1/payment-intents'),
  )
  await dialog.getByRole('button', { name: 'Create payment' }).click()
  expect((await request).postDataJSON()).toMatchObject({ amount: 125050, currency: 'USD' })
})

test('an ambiguous amount is rejected instead of being read 100x too large', async ({ authedPage: page }) => {
  const dialog = await openCreatePayment(page, 'en')
  let sent = false
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/v1/payment-intents')) sent = true
  })

  await dialog.getByLabel('Amount').fill('12,50')
  await dialog.getByRole('button', { name: 'Create payment' }).click()

  await expect(dialog.getByText('Not a valid USD amount. Write it like 12,345.67.')).toBeVisible()
  expect(sent).toBe(false)
})
