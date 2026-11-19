import { expect, test } from './fixtures'

test('switching language re-renders without a reload and is remembered', async ({ authedPage: page }) => {
  await page.goto('/settings')
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Payments' }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // A marker on window disappears if the page reloads.
  await page.evaluate(() => Object.assign(window, { languageTestMarker: true }))
  await page.getByRole('radio', { name: 'Tiếng Việt' }).click()

  const nav = page.getByRole('navigation', { name: 'Chính' })
  await expect(nav.getByRole('link', { name: 'Thanh toán' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  expect(await page.evaluate(() => 'languageTestMarker' in window)).toBe(true)

  await page.reload()
  await expect(nav.getByRole('link', { name: 'Thanh toán' })).toBeVisible()

  // The topbar toggle switches back.
  await page.getByRole('button', { name: /Chuyển sang English/ }).click()
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Payments' }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})
