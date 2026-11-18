import { expect, test } from '@playwright/test'
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
    ready: (page) => expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible(),
  },
  {
    name: 'register',
    path: '/register',
    auth: false,
    ready: (page) => expect(page.getByLabel('Password')).toBeVisible(),
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
]

for (const target of TARGETS) {
  test.describe(target.name, () => {
    for (const variant of VARIANTS) {
      test(variantId(variant), async ({ browser, baseURL }) => {
        await capture(browser, baseURL!, target, variant)
      })
    }
  })
}
