import type { Page } from '@playwright/test'
import { expect, freshMerchant, test } from './fixtures'

/**
 * An API key's whole life against the real backend: created in the dashboard,
 * shown once, accepted by the Merchant API, revoked, then refused with
 * 401 API_KEY_REVOKED. Runs on its own merchant so the seeded key list stays as
 * the shots expect it.
 */
async function merchantApi(page: Page, key: string) {
  const res = await page.request.get('/api/v1/payment-intents?size=1', {
    headers: { Authorization: `Bearer ${key}` },
  })
  return { status: res.status(), body: (await res.json()) as { code?: string } }
}

test('a key works until it is revoked, then fails with 401 API_KEY_REVOKED', async ({ page }) => {
  // Sign-up, several page loads and Merchant API calls; the local backend pool is small.
  test.slow()
  const { apiKey: otherKey } = await freshMerchant(page, 'keys')
  await page.goto('/developers/api-keys')

  // 1. Create: the secret is shown once.
  await page.getByRole('button', { name: 'Create key' }).click()
  const form = page.getByRole('dialog', { name: 'Create API key' })
  await form.getByLabel('Name').fill('Checkout E2E')
  await form.getByRole('button', { name: 'Create key' }).click()
  const reveal = page.getByRole('dialog', { name: 'Copy your new key' })
  await reveal.getByRole('button', { name: 'Show' }).click()
  const secret = (await reveal.locator('code').textContent())!.trim()
  expect(secret).toMatch(/^fp_test_\S+$/)
  await reveal.getByRole('button', { name: 'I’ve stored it' }).click()
  await expect(reveal).toBeHidden()
  // Gone from the page once dismissed; only the prefix stays in the list.
  expect(await page.locator('body').textContent()).not.toContain(secret)
  const row = page.getByRole('row').filter({ hasText: 'Checkout E2E' })
  await expect(row).toContainText('Active')
  await expect(row).toContainText(secret.slice(0, 11))

  // 2. The Merchant API accepts it.
  expect((await merchantApi(page, secret)).status).toBe(200)

  // 3. Revoke after confirming.
  await row.getByRole('button', { name: 'Revoke' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Revoke “Checkout E2E”?' })
  await expect(confirm.getByText(/401 API_KEY_REVOKED/)).toBeVisible()
  await confirm.getByRole('button', { name: 'Revoke key' }).click()
  await expect(confirm).toBeHidden()
  await expect(page.getByText('Revoked “Checkout E2E”')).toBeVisible()
  await expect(row).toContainText('Revoked')
  await expect(row.getByRole('button', { name: 'Revoke' })).toHaveCount(0)

  // 4. The backend refuses it from the next request on, with the code the dialog named.
  const refused = await merchantApi(page, secret)
  expect(refused).toMatchObject({ status: 401, body: { code: 'API_KEY_REVOKED' } })

  // 5. The revocation is the server's, not just the page's; the other key still works.
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: 'Checkout E2E' })).toContainText('Revoked')
  expect((await merchantApi(page, otherKey)).status).toBe(200)
})
