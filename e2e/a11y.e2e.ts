import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, signIn, test } from './fixtures'

/**
 * Accessibility baseline: axe (WCAG 2.2 A/AA rules) on every page and on the
 * gallery's open overlays, in both themes. Serious and critical violations
 * fail the test; minor and moderate ones are printed so they can be tracked.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function scan(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const summary = (v: (typeof violations)[number]) =>
    `${v.impact} ${v.id}: ${v.help} — ${v.nodes
      .slice(0, 3)
      .map((n) => n.target.join(' '))
      .join(' | ')}`
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  const other = violations.filter((v) => !blocking.includes(v))
  if (other.length) console.log(`[a11y] ${page.url()}\n  ${other.map(summary).join('\n  ')}`)
  return blocking.map(summary)
}

interface Target {
  name: string
  path: string
  auth: boolean
  /** Waits for real content, then sets up the state to scan. */
  ready: (page: Page) => Promise<void>
}

const heading = (page: Page, name?: string) =>
  expect(page.getByRole('heading', { level: 1, ...(name ? { name } : {}) })).toBeVisible()

const TARGETS: Target[] = [
  {
    name: 'login',
    path: '/login',
    auth: false,
    ready: (p) => expect(p.getByLabel('Password', { exact: true })).toBeVisible(),
  },
  {
    name: 'register',
    path: '/register',
    auth: false,
    ready: (p) => expect(p.getByLabel('Password', { exact: true })).toBeVisible(),
  },
  {
    name: 'gallery',
    path: '/dev/ui',
    auth: false,
    ready: (p) => expect(p.getByRole('region', { name: 'Merchant statuses' })).toBeVisible(),
  },
  {
    name: 'gallery dialog',
    path: '/dev/ui',
    auth: false,
    ready: async (p) => {
      await p.getByRole('button', { name: 'Open dialog' }).click()
      await expect(p.getByRole('dialog')).toBeVisible()
    },
  },
  {
    name: 'gallery menu',
    path: '/dev/ui',
    auth: false,
    ready: async (p) => {
      await p.getByRole('button', { name: 'Open menu' }).click()
      await expect(p.getByRole('menu')).toBeVisible()
    },
  },
  {
    name: 'gallery sheet',
    path: '/dev/ui',
    auth: false,
    ready: async (p) => {
      await p.getByRole('button', { name: 'Open sheet' }).click()
      await expect(p.getByRole('dialog')).toBeVisible()
    },
  },
  {
    name: 'overview',
    path: '/',
    auth: true,
    ready: async (p) => {
      await heading(p, 'Overview')
      await expect(p.getByText('ORD-1012').first()).toBeVisible()
    },
  },
  {
    name: 'payments',
    path: '/payments',
    auth: true,
    ready: (p) => expect(p.getByText('ORD-1012').first()).toBeVisible(),
  },
  {
    name: 'payment detail',
    path: '/payments',
    auth: true,
    ready: async (p) => {
      await p.getByText('ORD-1012').first().click()
      await expect(p.getByText('Refund capacity')).toBeVisible()
    },
  },
  {
    name: 'api keys',
    path: '/developers/api-keys',
    auth: true,
    ready: async (p) => {
      await heading(p, 'API keys')
      await expect(p.getByRole('table')).toBeVisible()
    },
  },
  {
    name: 'webhooks',
    path: '/developers/webhooks',
    auth: true,
    ready: async (p) => {
      await heading(p, 'Webhooks')
      await expect(p.getByRole('list').first()).toBeVisible()
    },
  },
  {
    name: 'deliveries',
    path: '/developers/webhooks/deliveries',
    auth: true,
    ready: async (p) => {
      await heading(p, 'Webhooks')
      await expect(p.getByRole('table')).toBeVisible()
    },
  },
  {
    name: 'settings',
    path: '/settings',
    auth: true,
    ready: async (p) => {
      await heading(p, 'Settings')
      await expect(p.getByRole('radio', { name: 'Tiếng Việt' })).toBeVisible()
    },
  },
]

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`a11y ${colorScheme}`, () => {
    test.use({ colorScheme, reducedMotion: 'reduce' })

    for (const target of TARGETS) {
      test(target.name, async ({ page }) => {
        // axe walks the whole DOM; the gallery is long, so allow more than the default.
        test.slow()
        if (target.auth) await signIn(page)
        await page.goto(target.path)
        await target.ready(page)
        expect(await scan(page)).toEqual([])
      })
    }
  })
}
