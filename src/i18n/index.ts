import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { setFormatLocale } from '@/lib/locale'
import { isLanguage, type Language } from './language'
import { CORE_NAMESPACES, coreEn, NAMESPACES, type Namespace } from './resources'

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

/** Every message file, one chunk each; English core files are also bundled (resources.ts). */
const FILES: Record<Language, Record<string, () => Promise<Record<string, object>>>> = {
  en: import.meta.glob<Record<string, object>>('./en/*.ts'),
  vi: import.meta.glob<Record<string, object>>('./vi/*.ts'),
}

/**
 * Loads these namespaces in this language unless they already are. Feature routes
 * call it with their namespaces (app/routes.ts), the app with the core ones at start.
 */
export async function ensureMessages(language: Language, namespaces: readonly Namespace[]) {
  const missing = namespaces.filter((ns) => !i18n.hasResourceBundle(language, ns))
  await Promise.all(
    missing.map(async (ns) => {
      const load = FILES[language][`./${language}/${ns}.ts`]
      if (!load) throw new Error(`No ${language} messages for ${ns}`)
      const module = await load()
      i18n.addResourceBundle(language, ns, module[ns]!, true, true)
    }),
  )
}

/** The namespaces loaded so far in the active language (what the screens on show use). */
const loadedNamespaces = () => NAMESPACES.filter((ns) => i18n.hasResourceBundle(i18n.language, ns))

/** The active UI language. */
export const currentLanguage = (): Language => (isLanguage(i18n.language) ? i18n.language : 'en')

const initial = detectLanguage(
  readStored(),
  navigator.languages?.length ? navigator.languages : [navigator.language],
)

void i18n.use(initReactI18next).init({
  resources: { en: coreEn },
  lng: initial,
  fallbackLng: 'en',
  ns: CORE_NAMESPACES,
  defaultNS: 'shell',
  // English core is bundled, so init is synchronous; main.tsx awaits i18nReady before
  // the first render, so a Vietnamese reader never sees English flash.
  initAsync: false,
  interpolation: { escapeValue: false }, // React already escapes
})

/** Resolves once the detected language's core messages are loaded. */
export const i18nReady: Promise<void> = ensureMessages(initial, CORE_NAMESPACES).then(async () => {
  if (initial !== 'en') await i18n.changeLanguage(initial)
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
  // Whatever is on screen now must exist in the new language before switching.
  await ensureMessages(language, [...new Set([...CORE_NAMESPACES, ...loadedNamespaces()])])
  await i18n.changeLanguage(language)
}

export { i18n }
export { useErrorMessage } from './errors'
export { useFormat } from './format'
export { useRoleLabel } from './roles'
export { useFieldError, vmsg } from './validation'
