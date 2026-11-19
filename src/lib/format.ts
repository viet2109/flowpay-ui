import { formatLocale } from './locale'

/**
 * Dates follow the UI language (see lib/locale): "19 Nov 2026, 14:05:12" in
 * English, "19/11/2026 14:05:12" in Vietnamese. The date and time parts are
 * formatted separately and joined, because vi-VN's own order puts the time first.
 */
const numericDates = (locale: string) => locale.startsWith('vi')

const cache = new Map<string, Intl.DateTimeFormat>()
function formatter(locale: string, kind: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${kind}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options)
    cache.set(key, f)
  }
  return f
}

const TIME_SECONDS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
}
const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

/**
 * "19 Nov 2026" / "19/11/2026". Vietnamese parts are joined by hand: Intl
 * writes "19-11" when the year is left out.
 */
function datePart(d: Date, locale: string, withYear: boolean): string {
  if (!numericDates(locale)) {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
    if (withYear) options.year = 'numeric'
    return formatter(locale, withYear ? 'date' : 'short', options).format(d)
  }
  const parts = formatter(locale, 'numeric', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return [get('day'), get('month'), ...(withYear ? [get('year')] : [])].join('/')
}

const join = (locale: string, date: string, time: string) =>
  `${date}${numericDates(locale) ? ' ' : ', '}${time}`

/** "19 Nov 2026, 14:05:12" / "19/11/2026 14:05:12". */
export function formatDateTime(iso: string | null | undefined, locale = formatLocale()): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return join(locale, datePart(d, locale, true), formatter(locale, 'time-s', TIME_SECONDS).format(d))
}

/** "19 Nov, 14:05" / "19/11 14:05": for timelines within the year. */
export function formatShortDate(iso: string | null | undefined, locale = formatLocale()): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return join(locale, datePart(d, locale, false), formatter(locale, 'time', TIME).format(d))
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
]

const relativeCache = new Map<string, Intl.RelativeTimeFormat>()

/** "5 min. ago" / "5 phút trước"; under 10 seconds "now" / "bây giờ". */
export function formatRelative(iso: string, now = Date.now(), locale = formatLocale()): string {
  let relative = relativeCache.get(locale)
  if (!relative) {
    relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
    relativeCache.set(locale, relative)
  }
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  if (Math.abs(seconds) < 10) return relative.format(0, 'second')
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return relative.format(0, 'second')
}

/** "84 ms", "1.23 s" / "1,23 s". */
export function formatDuration(ms: number | null | undefined, locale = formatLocale()): string {
  if (ms === null || ms === undefined) return '—'
  return ms < 1000
    ? `${new Intl.NumberFormat(locale).format(ms)} ms`
    : `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ms / 1000)} s`
}

/** "PARTIALLY_REFUNDED" -> "Partially refunded" */
export function humanize(value: string): string {
  const lower = value.replace(/[_.]/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
