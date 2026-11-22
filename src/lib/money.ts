import { formatLocale } from './locale'

/**
 * FlowPay stores money as integer minor units (BR-MONEY-001). The number of
 * decimals depends on the currency: VND 0, USD 2, KWD 3. Never do arithmetic on
 * floats; convert only at the display/input boundary.
 */
const fractionCache = new Map<string, number>()

export function currencyDigits(currency: string): number {
  const code = currency.toUpperCase()
  let digits = fractionCache.get(code)
  if (digits === undefined) {
    try {
      // The fraction digits of a currency are the same in every locale.
      digits =
        new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
          .maximumFractionDigits ?? 2
    } catch {
      digits = 2
    }
    fractionCache.set(code, digits)
  }
  return digits
}

// Building an Intl.NumberFormat costs far more than formatting with one, and a table
// formats every row's amount on each render: one formatter per locale and precision.
const numberFormatCache = new Map<string, Intl.NumberFormat>()

function numberFormat(locale: string, digits?: number): Intl.NumberFormat {
  const key = `${locale}|${digits ?? ''}`
  let format = numberFormatCache.get(key)
  if (!format) {
    format = new Intl.NumberFormat(
      locale,
      digits === undefined ? undefined : { minimumFractionDigits: digits, maximumFractionDigits: digits },
    )
    numberFormatCache.set(key, format)
  }
  return format
}

/** 500000 VND -> "500,000" (en) / "500.000" (vi); 12345 USD -> "123.45" / "123,45" */
export function formatMinor(amount: number, currency: string, locale = formatLocale()): string {
  const digits = currencyDigits(currency)
  return numberFormat(locale, digits).format(amount / 10 ** digits)
}

/** Plain counts: 1234 -> "1,234" / "1.234". */
export function formatNumber(value: number, locale = formatLocale()): string {
  return numberFormat(locale).format(value)
}

const separatorCache = new Map<string, { group: string; decimal: string }>()

/** Grouping and decimal separators of a locale: en "," and "."; vi "." and ",". */
export function numberSeparators(locale = formatLocale()) {
  let separators = separatorCache.get(locale)
  if (!separators) {
    const parts = new Intl.NumberFormat(locale, { useGrouping: true }).formatToParts(12345.6)
    separators = {
      group: parts.find((p) => p.type === 'group')?.value ?? ',',
      decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
    }
    separatorCache.set(locale, separators)
  }
  return separators
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Parse what a person typed into minor units with string math, so float
 * rounding can never reach the API. Separators follow the locale: "1,250.50"
 * (en) or "1.250,50" (vi). A grouping separator is only valid before exactly
 * three digits, so "12,50" in English is rejected instead of being read as
 * 1250. Spaces are ignored. Returns null when the input is not a valid amount.
 */
export function parseToMinor(input: string, currency: string, locale = formatLocale()): number | null {
  const digits = currencyDigits(currency)
  const { group, decimal } = numberSeparators(locale)
  const cleaned = input.replace(/[\s_]/g, '')
  const whole = String.raw`(\d+|\d{1,3}(?:${escape(group)}\d{3})+)`
  const fraction = digits === 0 ? '' : String.raw`(?:${escape(decimal)}(\d{1,${digits}}))?`
  const match = new RegExp(`^${whole}${fraction}$`).exec(cleaned)
  if (!match) return null
  const units = (match[1] ?? '').split(group).join('')
  const minor = Number(units + (match[2] ?? '').padEnd(digits, '0'))
  return Number.isSafeInteger(minor) ? minor : null
}

/** Inverse of parseToMinor, for pre-filling inputs: locale decimal separator, no grouping. */
export function minorToInput(amount: number, currency: string, locale = formatLocale()): string {
  const digits = currencyDigits(currency)
  if (digits === 0) return String(amount)
  const s = String(amount).padStart(digits + 1, '0')
  return `${s.slice(0, -digits)}${numberSeparators(locale).decimal}${s.slice(-digits)}`
}

export const COMMON_CURRENCIES = ['VND', 'USD', 'EUR', 'SGD', 'JPY', 'THB'] as const
