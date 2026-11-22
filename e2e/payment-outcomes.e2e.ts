import type { Page } from '@playwright/test'
import { expect, freshMerchant, test } from './fixtures'

/**
 * Every simulator outcome through the dashboard, against the real backend. The
 * dev profile picks the outcome from the amount's last digits (docs/local-stack.md
 * §6): 901 declined, 902 unknown, 903 technical failure; anything else succeeds.
 * Each payment is created and confirmed in the dialog, then read on its page.
 * Runs on its own merchant.
 */
interface Outcome {
  name: string
  amount: string
  toast: RegExp
  status: string
  code?: string
}

const OUTCOMES: Outcome[] = [
  { name: 'success', amount: '125000', toast: /^Payment succeeded · 125,000 VND$/, status: 'Succeeded' },
  {
    name: 'decline',
    amount: '250901',
    toast: /^Payment failed · 250,901 VND$/,
    status: 'Failed',
    code: 'CARD_DECLINED',
  },
  {
    name: 'technical failure',
    amount: '120903',
    toast: /^Payment failed · 120,903 VND$/,
    status: 'Failed',
    code: 'PROVIDER_UNAVAILABLE',
  },
  {
    name: 'unknown outcome',
    amount: '780902',
    toast: /^Provider outcome unknown$/,
    status: 'Processing',
    code: 'PROVIDER_TIMEOUT',
  },
]

async function createAndConfirm(page: Page, amount: string) {
  await page.goto('/payments')
  await page.getByRole('button', { name: 'New test payment' }).click()
  const dialog = page.getByRole('dialog', { name: 'New test payment' })
  await dialog.getByLabel('Amount').fill(amount)
  await dialog.getByRole('button', { name: 'Create payment' }).click()
  await expect(dialog).toBeHidden()
}

test.describe('simulator outcomes', () => {
  // Sign-up plus one create-and-confirm per outcome against the real backend.
  test.slow()

  for (const outcome of OUTCOMES) {
    test(`${outcome.name}: reported once, then shown on the payment`, async ({ page }) => {
      await freshMerchant(page, `outcome-${outcome.amount}`)
      await createAndConfirm(page, outcome.amount)

      const toast = page.locator('[data-sonner-toast]').filter({ has: page.getByText(outcome.toast) })
      await expect(toast).toBeVisible()
      if (outcome.code && outcome.status === 'Failed') await expect(toast).toContainText(outcome.code)
      // A technical failure must not read as a decline (a real decline's own code and message do).
      if (outcome.code === 'PROVIDER_UNAVAILABLE') await expect(toast).not.toContainText(/declined/i)
      await toast.getByRole('button', { name: 'View' }).click()
      await expect(page).toHaveURL(/\/payments\/pi_\w+$/)

      // The status badge sits in the page title, next to the amount.
      await expect(
        page.getByRole('heading', { level: 1 }).getByText(outcome.status, { exact: true }),
      ).toBeVisible()
      const rail = page.getByRole('list', { name: 'Payment lifecycle' })
      const attempts = page
        .locator('section')
        .filter({ has: page.getByText('Provider attempts', { exact: true }) })

      // Confirm is never offered again; refund only once the payment succeeded.
      await expect(page.getByRole('button', { name: 'Confirm payment' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Refund' })).toHaveCount(
        outcome.status === 'Succeeded' ? 1 : 0,
      )

      if (outcome.status === 'Succeeded') {
        await expect(rail.locator('li[aria-current=step]')).toContainText('Succeeded')
        await expect(rail.locator('li[aria-current=step] time')).toBeVisible()
        await expect(attempts.getByText('Succeeded', { exact: true })).toBeVisible()
      }
      if (outcome.status === 'Failed') {
        await expect(page.getByText('The provider did not complete the payment')).toBeVisible()
        await expect(rail.locator('li[aria-current=step]')).toContainText('Failed')
        await expect(attempts.getByText(outcome.code!, { exact: true })).toBeVisible()
        await expect(attempts.getByText('Failed', { exact: true })).toBeVisible()
      }
      if (outcome.status === 'Processing') {
        await expect(page.getByText('Waiting for the provider’s outcome')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Check again' })).toBeVisible()
        await expect(attempts.getByText('Outcome unknown', { exact: true })).toBeVisible()
        // The step that has not happened carries no time.
        const succeeded = rail.locator('li').filter({ hasText: 'Succeeded' })
        await expect(succeeded.locator('time')).toHaveCount(0)
      }
    })
  }
})
