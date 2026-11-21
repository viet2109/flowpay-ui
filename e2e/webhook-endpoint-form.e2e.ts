import { expect, test } from './fixtures'

// Deliveries for endpoints made here go to a closed local port: the dev backend
// allows http://localhost (WEBHOOK_ALLOW_INSECURE_LOCALHOST) and nothing leaves the machine.
const localUrl = (path: string) => `http://localhost:9/${path}-${Date.now().toString(36)}`

test('a URL the backend refuses is explained on the URL field', async ({ authedPage: page }) => {
  await page.goto('/developers/webhooks')
  await page.getByRole('button', { name: 'Add endpoint' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add webhook endpoint' })

  // A cloud metadata address: valid syntax, so only the server's URL policy can refuse it.
  await dialog.getByLabel('Endpoint URL').fill('http://169.254.169.254/latest/meta-data')
  await dialog.getByRole('button', { name: 'Add endpoint' }).click()

  await expect(dialog.getByText(/FlowPay will not send to this address/)).toBeVisible()
  await expect(dialog.getByLabel('Endpoint URL')).toHaveAttribute('aria-invalid', 'true')
  await expect(dialog.getByRole('alert')).toHaveCount(0)
})

test('create with the event matrix, store the secret once, then edit the events', async ({
  authedPage: page,
}) => {
  test.slow()
  const url = localUrl('form')
  await page.goto('/developers/webhooks')
  await page.getByRole('button', { name: 'Add endpoint' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add webhook endpoint' })

  await dialog.getByLabel('Endpoint URL').fill(url)
  // Defaults are the four final outcomes. A partly selected row header selects the
  // whole row first; pressed again, it clears the row.
  await expect(dialog.getByText('4 of 6 selected')).toBeVisible()
  const refundRow = dialog.getByRole('button', { name: 'Refund', exact: true })
  await refundRow.click()
  await expect(dialog.getByText('5 of 6 selected')).toBeVisible()
  await refundRow.click()
  await expect(dialog.getByText('2 of 6 selected')).toBeVisible()
  await dialog.getByRole('button', { name: 'Add endpoint' }).click()

  const created = page.getByRole('dialog', { name: 'Endpoint created' })
  await expect(created.getByText('Signing secret')).toBeVisible()
  await created.getByRole('button', { name: 'I’ve stored it' }).click()

  await expect(page).toHaveURL(/\/developers\/webhooks\/wep_\w+$/)
  await expect(page.getByTitle(url).first()).toBeVisible()

  await page.getByRole('button', { name: 'Edit' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit endpoint' })
  await expect(edit.getByRole('checkbox', { name: 'payment.succeeded' })).toBeChecked()
  await expect(edit.getByRole('checkbox', { name: 'refund.succeeded' })).not.toBeChecked()
  await edit.getByRole('checkbox', { name: 'refund.succeeded' }).click()
  await edit.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText('Endpoint updated')).toBeVisible()
  await expect(edit).toBeHidden()
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('dialog', { name: 'Edit endpoint' }).getByText('3 of 6 selected')).toBeVisible()
})
