import type { Page } from '@playwright/test'
import { expect, seeded, test } from './fixtures'

test.describe('sign in', () => {
  test('through the form lands on Overview for the seeded merchant', async ({ page }) => {
    const { email, password, merchantName } = seeded()
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    // The signed-in business, named on the sidebar's merchant card.
    await expect(
      page.getByText(merchantName, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible()
  })

  test('wrong password shows the mapped server message', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(seeded().email)
    await page.getByLabel('Password', { exact: true }).fill('not-the-password')
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
  await expect(page.getByText('ORD-1012').filter({ visible: true })).toBeVisible()
})

test.describe('create account', () => {
  async function fillRegister(page: Page, email: string) {
    await page.goto('/register')
    await page.getByLabel('First name').fill('Viet')
    await page.getByLabel('Last name').fill('Nguyen')
    await page.getByLabel('Business name').fill('E2E Store')
    await page.getByLabel('Work email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('FlowPay-e2e-2026')
    await page.getByRole('button', { name: 'Create account' }).click()
  }

  test('a new account is handed to sign-in, which then opens the dashboard', async ({ page }) => {
    const email = `e2e+${Date.now().toString(36)}@example.com`
    await fillRegister(page, email)

    await expect(page.getByText(`Account created. Sign in with ${email}.`)).toBeVisible()
    await expect(page.getByLabel('Email')).toHaveValue(email)
    await page.getByLabel('Password', { exact: true }).fill('FlowPay-e2e-2026')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  })

  test('a taken email is shown on the field, with a way to sign in with it', async ({ page }) => {
    const { email } = seeded()
    await fillRegister(page, email)

    await expect(page.getByText('An account with this email already exists.')).toBeVisible()
    await page.getByRole('link', { name: 'Sign in with this email' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByLabel('Email')).toHaveValue(email)
  })
})
