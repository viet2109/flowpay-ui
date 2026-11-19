/**
 * The BCP 47 locale used for numbers and dates. It follows the UI language
 * (src/i18n sets it), so a Vietnamese UI shows "500.000" and "19/11/2026 14:05"
 * and an English one "500,000" and "19 Nov 2026, 14:05".
 */
const BY_LANGUAGE: Record<string, string> = { vi: 'vi-VN', en: 'en-GB' }
const DEFAULT_LOCALE = 'en-GB'

let current = DEFAULT_LOCALE

export function localeFor(language: string): string {
  return BY_LANGUAGE[language] ?? DEFAULT_LOCALE
}

export function setFormatLocale(language: string) {
  current = localeFor(language)
}

/** The active formatting locale. Components use useFormat() so they re-render on change. */
export function formatLocale(): string {
  return current
}
