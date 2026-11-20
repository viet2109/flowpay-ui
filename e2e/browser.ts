import { existsSync } from 'node:fs'
import { chromium } from '@playwright/test'

/**
 * Browser: Playwright's bundled Chromium when installed (`npx playwright install
 * chromium`), otherwise the system Edge. Override with E2E_BROWSER_CHANNEL
 * (`chromium`, `msedge`, `chrome`).
 */
export const BROWSER_CHANNEL =
  process.env.E2E_BROWSER_CHANNEL ?? (existsSync(chromium.executablePath()) ? undefined : 'msedge')

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
