import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** The seeded endpoints (scripts/seed.ts) differ by URL path. */
const row = (page: Page, path: string) =>
  page.getByRole('listitem').filter({ has: page.getByTitle(new RegExp(`${path}$`)) })

test('the endpoint list shows each endpoint’s delivery health from the API', async ({ authedPage: page }) => {
  await page.goto('/developers/webhooks')
  await expect(page.getByRole('heading', { level: 1, name: 'Webhooks' })).toBeVisible()

  const healthy = row(page, '/ok')
  await expect(healthy.getByText('HTTP 200')).toBeVisible()
  await expect(healthy.getByText('Delivered', { exact: true })).toBeVisible()
  await expect(healthy.getByRole('link', { name: /dead|retrying/ })).toHaveCount(0)

  const failing = row(page, '/payments-broken')
  // HTTP 500 while the seed receiver ran; a transport failure code once it stopped.
  await expect(failing.getByText(/^(HTTP 500|[A-Z]+_[A-Z_]+)$/)).toBeVisible()
  await expect(failing.getByText('Retrying', { exact: true })).toBeVisible()

  await expect(row(page, '/refunds-retired').getByText('Receives no events')).toBeVisible()

  // The retrying count opens the deliveries list filtered to that endpoint.
  await failing.getByRole('link', { name: /retrying$/ }).click()
  await expect(page).toHaveURL(/\/developers\/webhooks\/deliveries\?endpointId=wep_\w+&status=RETRYING$/)
  await expect(page.getByRole('row').filter({ hasText: 'Retrying' }).first()).toBeVisible()
})

test('the URL opens the endpoint, and the row is reachable with the keyboard', async ({
  authedPage: page,
}) => {
  await page.goto('/developers/webhooks')
  const link = row(page, '/ok').getByRole('link', { name: /\/ok$/ })
  await link.focus()
  await expect(link).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/developers\/webhooks\/wep_\w+$/)
})
