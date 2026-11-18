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

/** 500000 VND -> "500,000"; 12345 USD -> "123.45" */
export function formatMinor(amount: number, currency: string, locale = 'en-US'): string {
  const digits = currencyDigits(currency)
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 10 ** digits)
}

/**
 * Parse what a person typed ("1,250.50") into minor units with string math,
 * so float rounding errors can never reach the API. Returns null when invalid.
 */
export function parseToMinor(input: string, currency: string): number | null {
  const digits = currencyDigits(currency)
  const cleaned = input.replace(/[\s,_]/g, '')
  const pattern = digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${digits}})?$`)
  if (!pattern.test(cleaned)) return null
  const [whole = '0', fraction = ''] = cleaned.split('.')
  const minor = Number(whole + fraction.padEnd(digits, '0'))
  return Number.isSafeInteger(minor) ? minor : null
}

/** Inverse of parseToMinor, for pre-filling inputs. No grouping separators. */
export function minorToInput(amount: number, currency: string): string {
  const digits = currencyDigits(currency)
  if (digits === 0) return String(amount)
  const s = String(amount).padStart(digits + 1, '0')
  return `${s.slice(0, -digits)}.${s.slice(-digits)}`
}

export const COMMON_CURRENCIES = ['VND', 'USD', 'EUR', 'SGD', 'JPY', 'THB'] as const
