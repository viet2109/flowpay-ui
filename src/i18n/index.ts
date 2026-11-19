import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import { NAMESPACES, resources } from './resources'

export const LANGUAGES = ['vi', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/** Always shown in their own language, whatever the UI language is. */
export const LANGUAGE_NAMES: Record<Language, string> = { vi: 'Tiếng Việt', en: 'English' }

const STORAGE_KEY = 'flowpay.language'

export const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language)

/** Stored choice first, then the first supported browser language, then English. */
export function detectLanguage(stored: string | null, browserLanguages: readonly string[]): Language {
  if (isLanguage(stored)) return stored
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLanguage(base)) return base
  }
  return 'en'
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(readStored(), navigator.languages?.length ? navigator.languages : [navigator.language]),
  fallbackLng: 'en',
  ns: NAMESPACES,
  defaultNS: 'shell',
  // Resources are bundled, so init is synchronous and the first render is translated.
  initAsync: false,
  interpolation: { escapeValue: false }, // React already escapes
})

const syncHtmlLang = (lng: string) => document.documentElement.setAttribute('lang', lng)
syncHtmlLang(i18n.language)
i18n.on('languageChanged', syncHtmlLang)

/** Switches the UI language without a reload and remembers it for this browser. */
export async function setLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    /* not persisted, still applied */
  }
  await i18n.changeLanguage(language)
}

/** The active UI language; re-renders the caller when it changes. */
export function useLanguage(): Language {
  const { i18n: instance } = useTranslation()
  return isLanguage(instance.language) ? instance.language : 'en'
}

export { i18n }
