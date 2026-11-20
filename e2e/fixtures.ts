import { test as base, expect, type Page } from '@playwright/test'
import type { SeedResult } from '../scripts/seed.ts'

export { expect }

/**
 * Storage keys the app reads at startup. Kept here so a rename in the app fails
 * loudly in one place.
 */
export const STORAGE = {
  /** lib/theme.ts — absent means "follow the system", which Playwright emulates. */
  theme: 'flowpay.theme',
  /** features/auth/session-store.ts — email shown in the account menu. */
  lastEmail: 'flowpay.lastEmail',
  /** features/test-mode/store.ts — zustand persist, sessionStorage. */
  testKey: 'flowpay.testKey',
  /** i18n/index.ts — chosen UI language. */
  language: 'flowpay.language',
} as const

export function seeded(): SeedResult {
  const raw = process.env.E2E_SEED
  if (!raw)
    throw new Error('E2E_SEED missing: run through `npm run e2e` / `npm run shots` (global setup seeds).')
  return JSON.parse(raw) as SeedResult
}

/**
 * Signs `page`'s browser context in through the API. Each context logs in on
 * its own: refresh tokens rotate, so a shared storage state would be revoked by
 * whichever test refreshed first.
 */
export async function signIn(page: Page, options: { connectTestKey?: boolean } = {}) {
  const data = seeded()
  const res = await page.request.post('/api/v1/auth/login', {
    headers: { 'X-FlowPay-CSRF': '1' },
    data: { email: data.email, password: data.password },
  })
  expect(res.status(), 'API login').toBe(200)
  const { data: login } = (await res.json()) as { data: { user: { id: string; email: string } } }

  await page.addInitScript(
    ({ storage, user, key }) => {
      localStorage.setItem(storage.lastEmail, JSON.stringify({ userId: user.id, email: user.email }))
      if (key)
        sessionStorage.setItem(storage.testKey, JSON.stringify({ state: { key, label: null }, version: 0 }))
    },
    { storage: STORAGE, user: login.user, key: options.connectTestKey === false ? null : data.apiKey },
  )
}

/** `authedPage`: a page whose context is signed in as the seeded merchant, test key connected. */
export const test = base.extend<{ authedPage: Page }>({
  // Playwright's fixture callback; named `provide` so the React hooks lint rule
  // does not mistake it for React's `use`.
  authedPage: async ({ page }, provide) => {
    await signIn(page)
    await provide(page)
  },
})
