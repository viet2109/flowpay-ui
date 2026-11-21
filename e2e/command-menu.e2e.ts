import { expect, STORAGE, test } from './fixtures'

test('Vietnamese typed without diacritics finds the page', async ({ authedPage: page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'vi'), STORAGE.language)
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Chính' })
  await expect(nav.getByRole('link', { name: 'Thanh toán' })).toBeVisible()

  await page.keyboard.press('Control+K')
  const menu = page.getByRole('dialog', { name: 'Bảng lệnh' })
  await menu.getByRole('combobox').fill('cai dat')
  // cmdk also fuzzy-matches lower down; the best match is first and selected.
  await expect(menu.getByRole('option').first()).toHaveText('Cài đặt')
  await expect(menu.getByRole('option', { name: 'Cài đặt' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Enter')

  await expect(menu).toBeHidden()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('aria-current', 'page')
})

test('an opened payment comes back under Recent, and a pasted ID jumps to it', async ({
  authedPage: page,
}) => {
  // Visits the list, a payment and the overview on the dev server.
  test.slow()
  await page.goto('/payments')
  await page.getByText('ORD-1012').filter({ visible: true }).first().click()
  await expect(page.getByText('Refund capacity')).toBeVisible()
  const paymentId = /\/payments\/(pi_\w+)/.exec(page.url())?.[1]
  expect(paymentId, 'payment detail URL').toBeTruthy()

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  await page.keyboard.press('Control+K')
  const menu = page.getByRole('dialog', { name: 'Command menu' })
  await expect(menu.getByRole('group', { name: 'Recent' }).getByRole('option')).toHaveText([/^ORD-1012 · /])

  // Pasted in lower case, as IDs often are when copied from logs.
  await menu.getByRole('combobox').fill(paymentId!.toLowerCase())
  await expect(menu.getByRole('option', { name: /^Open payment/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/payments/${paymentId}$`))
  await expect(page.getByText('Refund capacity')).toBeVisible()
})
