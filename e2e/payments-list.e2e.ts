import { expect, test } from './fixtures'

/** The payments list against the seeded merchant (scripts/seed.ts): read-only. */
test('filters narrow the real list, live in the URL and survive reload', async ({ authedPage: page }) => {
  await page.goto('/payments')
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
  await expect(rows.first()).toBeVisible()

  // Status: the seed has two failed payments (declined and technical failure).
  const status = page.getByLabel('Filter by status')
  await status.getByRole('radio', { name: 'Failed' }).click()
  await expect(page).toHaveURL(/\?status=FAILED$/)
  await expect(rows.filter({ hasNotText: 'Failed' })).toHaveCount(0)
  await expect(rows).toHaveCount(2)

  // Order ID matches exactly, after a short pause in typing.
  await status.getByRole('radio', { name: 'All', exact: true }).click()
  await page.getByLabel('Order ID').fill('ORD-1012')
  await expect(page).toHaveURL(/\?orderId=ORD-1012$/)
  await expect(rows).toHaveCount(1)
  await page.getByLabel('Order ID').fill('ORD-101')
  await expect(page.getByText('No payments match these filters')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Order ID')).toHaveValue('ORD-101')
  await page.getByRole('button', { name: 'Clear filters' }).first().click()
  await expect(page).toHaveURL(/\/payments$/)

  // Page size: the seed has more than 20 payments.
  await expect(page.getByText(/^1–20 of \d+$/)).toBeVisible()
  await page.getByRole('combobox', { name: 'Rows per page' }).selectOption('50')
  await expect(page).toHaveURL(/\?size=50$/)
  await expect(page.getByText(/^1–\d+ of \d+$/)).not.toHaveText(/^1–20 /)
})
