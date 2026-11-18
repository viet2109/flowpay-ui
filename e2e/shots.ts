import type { Browser, Page } from '@playwright/test'
import { signIn } from './fixtures'

/**
 * Screenshot review matrix (docs/task-roadmap.md working agreement): every UI
 * task ships each affected page in {light, dark} × {375, 1280} × {en, vi}.
 * Screenshots are review artifacts written to shots/, not visual baselines.
 */
export const THEMES = ['light', 'dark'] as const
export const WIDTHS = [375, 1280] as const
export const LOCALES = ['en', 'vi'] as const

export interface Variant {
  theme: (typeof THEMES)[number]
  width: (typeof WIDTHS)[number]
  locale: (typeof LOCALES)[number]
}

export const VARIANTS: Variant[] = THEMES.flatMap((theme) =>
  WIDTHS.flatMap((width) => LOCALES.map((locale) => ({ theme, width, locale }))),
)

export const variantId = (v: Variant) => `${v.width}-${v.theme}-${v.locale}`

export interface ShotTarget {
  /** Folder under shots/. */
  name: string
  path: string
  auth: boolean
  /** Resolves once the page shows its real content (not a skeleton), then sets up any state to capture. */
  ready: (page: Page) => Promise<void>
  /** Default true. Interaction shots (focus, open menu) capture the viewport around the element instead. */
  fullPage?: boolean
  /** Restrict locales, e.g. for copy that is not translated yet. Default: all. */
  locales?: Variant['locale'][]
}

/**
 * Opens `target` in a fresh context for `variant` and writes
 * shots/<name>/<width>-<theme>-<locale>.png. The browser locale is set now;
 * the UI language follows it once i18n lands (P1-T04).
 */
export async function capture(browser: Browser, baseURL: string, target: ShotTarget, variant: Variant) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: variant.width, height: 900 },
    deviceScaleFactor: variant.width < 768 ? 2 : 1,
    colorScheme: variant.theme,
    locale: variant.locale === 'vi' ? 'vi-VN' : 'en-US',
    timezoneId: 'Asia/Ho_Chi_Minh',
    // `animations: 'disabled'` below only stops CSS; reduced motion also makes the
    // JS fills (motion) render their final value, so bars are never caught mid-way.
    reducedMotion: 'reduce',
  })
  try {
    const page = await context.newPage()
    if (target.auth) await signIn(page)
    await page.goto(target.path)
    await target.ready(page)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: `shots/${target.name}/${variantId(variant)}.png`,
      fullPage: target.fullPage ?? true,
      animations: 'disabled',
    })
  } finally {
    await context.close()
  }
}
