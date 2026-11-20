import { chromium } from '@playwright/test'
import { seed, type SeedResult } from '../scripts/seed.ts'
import { BASE_URL, BROWSER_CHANNEL } from './browser'

const API = (process.env.SEED_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')

/** Pages that, together, load every route chunk the tests use. */
const WARM_PATHS = ['/', '/payments', '/developers/api-keys', '/developers/webhooks', '/settings', '/dev/ui']

/**
 * The Vite dev server compiles modules on first request, and after a code
 * change that first request can take many seconds. Visiting every page once,
 * signed in as the seeded merchant, pays that cost here instead of inside the
 * first tests' timeouts.
 */
async function warmDevServer({ email, password }: SeedResult) {
  const browser = await chromium.launch({ channel: BROWSER_CHANNEL })
  try {
    const page = await browser.newPage({ baseURL: BASE_URL })
    const login = await page.request.post('/api/v1/auth/login', {
      headers: { 'X-FlowPay-CSRF': '1' },
      data: { email, password },
    })
    if (!login.ok()) throw new Error(`Warm-up sign-in failed: HTTP ${login.status()}`)
    for (const path of WARM_PATHS) {
      await page.goto(path)
      await page.locator('h1').first().waitFor({ timeout: 120_000 })
    }
  } finally {
    await browser.close()
  }
}

/**
 * Runs once per `playwright test`: checks the backend is up, seeds a fresh
 * merchant with every UI state (scripts/seed.ts), then warms the dev server.
 * Workers read the seed from E2E_SEED; it is kept in memory only, never written to disk.
 */
export default async function globalSetup() {
  try {
    const health = await fetch(`${API}/actuator/health`)
    if (!health.ok) throw new Error(`HTTP ${health.status}`)
  } catch (error) {
    throw new Error(
      `Backend not reachable at ${API} (${error instanceof Error ? error.message : String(error)}). ` +
        'Start the local stack first: docs/local-stack.md.',
      { cause: error },
    )
  }
  const seeded = await seed({ quiet: true, receiverPort: 0 })
  process.env.E2E_SEED = JSON.stringify(seeded)
  await warmDevServer(seeded)
}
