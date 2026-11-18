import { expect, seeded, test } from './fixtures'

test.describe('sign in', () => {
  test('through the form lands on Overview for the seeded merchant', async ({ page }) => {
    const { email, password, merchantName } = seeded()
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    await expect(page.getByText(`What needs your attention at ${merchantName}.`)).toBeVisible()
  })

  test('wrong password shows the mapped server message', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(seeded().email)
    await page.getByLabel('Password').fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('That email and password combination is not recognised.')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('session survives a reload (refresh cookie)', async ({ authedPage: page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  })
})

test('fixture: payments render from the real backend with the connected test key', async ({
  authedPage: page,
}) => {
  await page.goto('/payments')
  await expect(page.getByRole('heading', { level: 1, name: 'Payments' })).toBeVisible()
  await expect(page.getByText('ORD-1012')).toBeVisible()
})
