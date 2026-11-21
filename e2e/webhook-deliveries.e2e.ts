import { expect, test } from './fixtures'

/**
 * The deliveries list against the seeded merchant (scripts/seed.ts has DELIVERED,
 * RETRYING and DEAD deliveries). Read-only: nothing here changes the seeded data.
 */
test('a filtered list and an open delivery survive reload, and Back closes the delivery', async ({
  authedPage: page,
}) => {
  await page.goto('/developers/webhooks/deliveries')
  await page.getByRole('radio', { name: 'Dead' }).click()
  await expect(page).toHaveURL(/[?&]status=DEAD(&|$)/)
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
  // Waits for the filtered page to replace the unfiltered one.
  await expect(rows.filter({ hasNotText: 'Dead' })).toHaveCount(0)
  await expect(rows.first()).toContainText('Dead')

  // The event cell: the row's middle holds a copy button, which does not open the sheet.
  await rows.first().getByRole('cell').first().click()
  await expect(page).toHaveURL(/[?&]delivery=wdl_\w+/)
  const deliveryId = new URL(page.url()).searchParams.get('delivery')!
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByTitle(deliveryId)).toBeVisible()

  // A shared link: the same filter and the same delivery after a reload.
  await page.reload()
  await expect(page.getByRole('dialog').getByTitle(deliveryId)).toBeVisible()
  // Behind the modal sheet, so outside the accessibility tree until it closes.
  await expect(page.getByRole('radio', { name: 'Dead', includeHidden: true })).toBeChecked()

  await page.goBack()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).toHaveURL(/[?&]status=DEAD(&|$)/)
  await expect(page).not.toHaveURL(/delivery=/)
})

test('a link to a delivery that does not exist says so', async ({ authedPage: page }) => {
  await page.goto('/developers/webhooks/deliveries?delivery=wdl_00000000000000000000000000')
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText('There is no delivery with this ID in your account.')).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Try again' })).toHaveCount(0)
})

test('dead deliveries on a disabled endpoint are not offered or counted as retryable', async ({
  authedPage: page,
}) => {
  // The seeded merchant's only dead deliveries were cancelled by disabling their endpoint.
  await page.goto('/')
  const deadRow = page.getByRole('link', { name: /dead webhook deliver(y|ies) you can retry/ })
  await expect(deadRow).toContainText('0')

  await page.goto('/developers/webhooks/deliveries?status=DEAD')
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
  await rows.first().getByRole('cell').first().click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText('The endpoint is disabled, so this delivery cannot be retried.')).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Retry' })).toHaveCount(0)
})
