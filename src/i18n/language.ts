import { useTranslation } from 'react-i18next'

export const LANGUAGES = ['vi', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/** Always shown in their own language, whatever the UI language is. */
export const LANGUAGE_NAMES: Record<Language, string> = { vi: 'Tiếng Việt', en: 'English' }

export const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language)

/** The active UI language; re-renders the caller when it changes. */
export function useLanguage(): Language {
  const { i18n } = useTranslation()
  return isLanguage(i18n.language) ? i18n.language : 'en'
}
