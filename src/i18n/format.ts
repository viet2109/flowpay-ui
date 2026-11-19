import { useMemo } from 'react'
import { formatDateTime, formatDuration, formatRelative, formatShortDate } from '@/lib/format'
import { localeFor } from '@/lib/locale'
import { formatMinor, formatNumber } from '@/lib/money'
import { useLanguage } from './language'

/**
 * Number and date formatters bound to the UI language. Components use this
 * instead of importing lib/format or lib/money directly, so they re-render
 * when the language changes (enforced by ESLint).
 */
export function useFormat() {
  const language = useLanguage()
  return useMemo(() => {
    const locale = localeFor(language)
    return {
      locale,
      /** 500000, "VND" -> "500.000" (vi) / "500,000" (en); the code is rendered separately. */
      money: (amount: number, currency: string) => formatMinor(amount, currency, locale),
      /** Amount with its code: "500.000 VND". */
      moneyWithCode: (amount: number, currency: string) =>
        `${formatMinor(amount, currency, locale)} ${currency}`,
      number: (value: number) => formatNumber(value, locale),
      dateTime: (iso: string | null | undefined) => formatDateTime(iso, locale),
      shortDate: (iso: string | null | undefined) => formatShortDate(iso, locale),
      relative: (iso: string, now?: number) => formatRelative(iso, now, locale),
      duration: (ms: number | null | undefined) => formatDuration(ms, locale),
    }
  }, [language])
}
