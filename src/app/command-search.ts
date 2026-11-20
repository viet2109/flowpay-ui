import { defaultFilter } from 'cmdk'

/** "Thanh toán" -> "thanh toan": Vietnamese is often typed without diacritics. */
export function foldDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
}

/** cmdk's own ranking, applied to diacritic-free text, so "thanh toan" finds "Thanh toán". */
export function commandFilter(value: string, search: string, keywords?: string[]): number {
  return defaultFilter(foldDiacritics(value), foldDiacritics(search), keywords?.map(foldDiacritics))
}

/** Public IDs are a type prefix and a ULID (docs/api-contract.md). */
const ID = /^(pi|wep|wdl)_[0-9A-HJKMNP-TV-Z]{26}$/

export type IdTarget = { kind: 'payment' | 'endpoint' | 'delivery'; id: string; to: string }

/** A pasted public ID and where it opens, or null when the text is not one. */
export function parseId(text: string): IdTarget | null {
  const trimmed = text.trim()
  const separator = trimmed.indexOf('_')
  if (separator < 0) return null
  // Prefixes are lowercase, the ULID uppercase; accept either case as pasted.
  const id = `${trimmed.slice(0, separator).toLowerCase()}_${trimmed.slice(separator + 1).toUpperCase()}`
  const match = ID.exec(id)
  if (!match) return null
  switch (match[1]) {
    case 'pi':
      return { kind: 'payment', id, to: `/payments/${id}` }
    case 'wep':
      return { kind: 'endpoint', id, to: `/developers/webhooks/${id}` }
    default:
      return { kind: 'delivery', id, to: `/developers/webhooks/deliveries?delivery=${id}` }
  }
}
