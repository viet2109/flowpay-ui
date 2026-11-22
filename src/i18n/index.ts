import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { setFormatLocale } from '@/lib/locale'
import { isLanguage, type Language } from './language'
import { NAMESPACES, resources } from './resources'

export { isLanguage, LANGUAGE_NAMES, LANGUAGES, useLanguage, type Language } from './language'

const STORAGE_KEY = 'flowpay.language'

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

/** Keeps <html lang> and the number/date locale in step with the UI language. */
function syncLanguage(lng: string) {
  document.documentElement.setAttribute('lang', lng)
  setFormatLocale(lng)
}
syncLanguage(i18n.language)
i18n.on('languageChanged', syncLanguage)

/** Switches the UI language without a reload and remembers it for this browser. */
export async function setLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    /* not persisted, still applied */
  }
  await i18n.changeLanguage(language)
}

export { i18n }
export { useErrorMessage } from './errors'
export { useFormat } from './format'
export { useRoleLabel } from './roles'
export { useFieldError, vmsg } from './validation'
