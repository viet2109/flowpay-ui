import { existsSync } from 'node:fs'
import { chromium, defineConfig, devices } from '@playwright/test'

/**
 * E2E and screenshot review against the real local stack (docs/local-stack.md).
 *
 *   npm run e2e     behaviour tests        (e2e/*.e2e.ts)
 *   npm run shots   review screenshots     (e2e/*.shots.ts -> shots/)
 *
 * Browser: Playwright's bundled Chromium when installed (`npx playwright install
 * chromium`), otherwise the system Edge. Override with E2E_BROWSER_CHANNEL
 * (`chromium`, `msedge`, `chrome`).
 */
const channel =
  process.env.E2E_BROWSER_CHANNEL ?? (existsSync(chromium.executablePath()) ? undefined : 'msedge')

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  globalSetup: './e2e/global-setup.ts',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    channel,
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
