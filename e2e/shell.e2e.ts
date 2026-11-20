import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

const focusedId = (page: Page) => page.evaluate(() => document.activeElement?.id ?? '')

test.describe('app shell on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('keeps the test-mode chip visible and navigates through the drawer', async ({ authedPage: page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    await expect(page.getByText('Test mode', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Jump to…' })).toBeVisible()

    await page.getByRole('button', { name: 'Open navigation' }).click()
    const drawer = page.getByRole('dialog', { name: 'Navigation' })
    await drawer.getByRole('link', { name: 'Payments' }).click()

    await expect(drawer).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'Payments' })).toBeVisible()
    await expect(page).toHaveTitle('Payments · FlowPay')
    // Focus lands on the new content, not back on the menu button.
    await expect.poll(() => focusedId(page)).toBe('main')
  })
})

test('the first Tab reaches "Skip to content", which moves focus to the page', async ({
  authedPage: page,
}) => {
  await page.goto('/developers/api-keys')
  await expect(page.getByRole('heading', { level: 1, name: 'API keys' })).toBeVisible()
  await expect(page).toHaveTitle('API keys · FlowPay')

  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  await page.keyboard.press('Enter')
  await expect.poll(() => focusedId(page)).toBe('main')
})
