import { expect, test, type Page } from '@playwright/test'
import { capture, VARIANTS, variantId, type ShotTarget } from './shots'

/**
 * Pages to capture with `npm run shots`. Add the pages a UI task touches;
 * filter with `npm run shots -- -g login`.
 */
const TARGETS: ShotTarget[] = [
  {
    name: 'login',
    path: '/login',
    auth: false,
    // Language-neutral: these pages are translated, and shots run in both languages.
    ready: (page) => expect(page.locator('input[type=password]')).toBeVisible(),
  },
  {
    name: 'register',
    path: '/register',
    auth: false,
    ready: (page) => expect(page.locator('input[type=password]')).toBeVisible(),
  },
  {
    name: 'overview',
    path: '/',
    auth: true,
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
      await expect(page.getByText('ORD-1012').first()).toBeVisible()
    },
  },
  {
    name: 'settings',
    path: '/settings',
    auth: true,
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('radio', { name: 'Tiếng Việt' })).toBeVisible()
    },
  },
  {
    name: 'webhooks',
    path: '/developers/webhooks',
    auth: true,
    // "HTTP 200" is the healthy seeded endpoint's last delivery, in either language.
    ready: (page) => expect(page.getByText('HTTP 200')).toBeVisible(),
  },
  {
    name: 'webhook-form',
    path: '/developers/webhooks',
    auth: true,
    fullPage: false,
    // The add dialog with the server's URL-policy rejection shown on the URL field.
    ready: async (page) => {
      await expect(page.getByText('HTTP 200')).toBeVisible()
      await page.getByRole('button', { name: /^(Add endpoint|Thêm endpoint)$/ }).click()
      const dialog = page.getByRole('dialog')
      await dialog.locator('input[name=url]').fill('http://169.254.169.254/latest/meta-data')
      await dialog.locator('button[type=submit]').click()
      await expect(dialog.locator('input[name=url][aria-invalid=true]')).toBeVisible()
    },
  },
  {
    name: 'webhook-endpoint',
    path: '/developers/webhooks',
    auth: true,
    ready: async (page) => {
      await page.getByRole('link', { name: /\/ok$/ }).click()
      await expect(page.getByRole('table')).toBeVisible()
    },
  },
  {
    name: 'webhook-disable',
    path: '/developers/webhooks',
    auth: true,
    fullPage: false,
    // The failing seeded endpoint has retrying deliveries, so the consequence line shows. Not confirmed.
    ready: async (page) => {
      await page.getByRole('link', { name: /\/payments-broken$/ }).click()
      await page.getByRole('button', { name: /^(More actions|Thao tác khác)$/ }).click()
      await page.getByRole('menuitem', { name: /^(Disable endpoint|Tắt endpoint)$/ }).click()
      await expect(page.getByRole('alertdialog').locator('p.num')).toBeVisible()
    },
  },
  {
    name: 'command-menu',
    path: '/',
    auth: true,
    fullPage: false,
    // Opens a payment first so "Recent" has a real entry.
    ready: async (page) => {
      await page.getByText('ORD-1012').first().click()
      await expect(page).toHaveURL(/\/payments\/pi_/)
      await page.keyboard.press('Control+K')
      await expect(page.getByRole('dialog').getByRole('option').first()).toBeVisible()
    },
  },
  ...galleryTargets(),
]

/**
 * /dev/ui: every primitive in every prop state, plus the states that
 * need interaction. The full page runs in both languages (components translate;
 * the gallery's own captions stay English); interaction shots run in English.
 */
function galleryTargets(): ShotTarget[] {
  const gallery = { path: '/dev/ui', auth: false, locales: ['en' as const] }
  // Feature sections load lazily; the last one appearing means the page is complete.
  const loaded = (page: Page) => expect(page.getByRole('region', { name: 'Merchant statuses' })).toBeVisible()
  const interaction = (name: string, act: (page: Page) => Promise<void>): ShotTarget => ({
    ...gallery,
    name: `ui-${name}`,
    fullPage: false,
    ready: async (page) => {
      await loaded(page)
      await act(page)
    },
  })
  // Chromium shows :focus-visible on programmatic focus only after keyboard input.
  const keyboardFocus = async (page: Page, target: ReturnType<Page['getByRole']>) => {
    await page.keyboard.press('Tab')
    await target.focus()
  }
  return [
    { ...gallery, name: 'ui-gallery', locales: undefined, ready: loaded },
    interaction('focus-input', async (page) => {
      await page.getByLabel('Filled', { exact: true }).focus()
      await page.getByRole('button', { name: 'Edit endpoint' }).hover()
    }),
    interaction('focus-invalid', async (page) => {
      await page.getByRole('region', { name: 'Text fields' }).getByLabel('Invalid', { exact: true }).focus()
    }),
    interaction('focus-button', async (page) => {
      const button = page
        .getByRole('region', { name: 'Button' })
        .getByRole('button', { name: 'Revoke key' })
        .first()
      await keyboardFocus(page, button)
    }),
    interaction('focus-checkbox', async (page) => {
      await keyboardFocus(page, page.getByRole('checkbox', { name: 'Checked', exact: true }))
    }),
    interaction('menu', async (page) => {
      await page.getByRole('button', { name: 'Open menu' }).click()
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await expect(page.getByRole('menuitem', { name: 'Disable endpoint' })).toBeFocused()
    }),
    interaction('dialog', async (page) => {
      await page.getByRole('button', { name: 'Open dialog' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
    }),
    interaction('confirm', async (page) => {
      await page.getByRole('button', { name: 'Open confirm' }).click()
      await expect(page.getByRole('alertdialog')).toBeVisible()
    }),
    interaction('sheet', async (page) => {
      await page.getByRole('button', { name: 'Open sheet' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
    }),
    interaction('tooltip', async (page) => {
      await page.getByRole('button', { name: 'Hover for tooltip' }).hover()
      await expect(page.getByRole('tooltip')).toBeVisible()
    }),
  ]
}

for (const target of TARGETS) {
  test.describe(target.name, () => {
    for (const variant of VARIANTS.filter((v) => !target.locales || target.locales.includes(v.locale))) {
      test(variantId(variant), async ({ browser, baseURL }) => {
        await capture(browser, baseURL!, target, variant)
      })
    }
  })
}
