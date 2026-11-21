import { defineConfig, devices } from '@playwright/test'
import { BASE_URL, BROWSER_CHANNEL } from './e2e/browser'

/**
 * `npm run e2e:retries`: the webhook retry path (e2e/*.retries.ts), which needs a
 * backend started with short retry delays (docs/local-stack.md). Kept out of
 * `npm run e2e` because short delays would turn the seeded RETRYING deliveries that
 * other tests rely on into DEAD within seconds. Its test signs up its own merchant,
 * so there is no seeding global setup here.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: /.*\.retries\.ts$/,
  outputDir: 'test-results',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // One test that waits on the backend's worker; parallel copies only slow each other.
  workers: 1,
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
})
