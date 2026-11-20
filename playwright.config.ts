import { defineConfig, devices } from '@playwright/test'
import { BASE_URL, BROWSER_CHANNEL } from './e2e/browser'

/**
 * E2E and screenshot review against the real local stack (docs/local-stack.md).
 *
 *   npm run e2e     behaviour tests        (e2e/*.e2e.ts)
 *   npm run shots   review screenshots     (e2e/*.shots.ts -> shots/)
 *
 * Browser and base URL: e2e/browser.ts. The global setup seeds a merchant and
 * warms the dev server, so the first tests do not pay for module compilation.
 */
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  globalSetup: './e2e/global-setup.ts',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // The first view of a page restores the session (refresh call) while the Vite
  // dev server compiles chunks on demand; with parallel workers that can pass
  // the 5 s default.
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    channel: BROWSER_CHANNEL,
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'e2e', testMatch: /.*\.e2e\.ts$/ },
    { name: 'shots', testMatch: /.*\.shots\.ts$/ },
  ],
})
