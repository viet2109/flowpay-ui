import { loadMerchantPages } from '@/features/merchant'
import { currentLanguage, ensureMessages } from '@/i18n'
import type { Namespace } from '@/i18n/resources'

/**
 * What each lazily-loaded page needs: its feature chunk and the message namespaces
 * its components read, in the active language, fetched in parallel. The router uses
 * these, and so does prefetching (on hover or focus of a link), so a prefetched page
 * opens without waiting.
 */
async function load<T>(module: Promise<T>, namespaces: Namespace[]): Promise<T> {
  const [loaded] = await Promise.all([module, ensureMessages(currentLanguage(), namespaces)])
  return loaded
}

export const pages = {
  // The overview shows a payments table (payments namespace) next to its own panels.
  overview: () => load(import('@/features/overview'), ['overview', 'payments']),
  payments: () => load(import('@/features/payments'), ['payments']),
  apiKeys: () => load(import('@/features/api-keys'), ['apiKeys']),
  webhooks: () => load(import('@/features/webhooks'), ['webhooks']),
  settings: () => load(loadMerchantPages(), ['merchant']),
}

/** Sidebar paths and the page each one opens, for prefetching. */
const BY_PATH: Record<string, () => Promise<unknown>> = {
  '/': pages.overview,
  '/payments': pages.payments,
  '/developers/api-keys': pages.apiKeys,
  '/developers/webhooks': pages.webhooks,
  '/settings': pages.settings,
}

/** Starts loading a page before it is opened. Failures are left to the navigation itself. */
export function prefetch(path: string) {
  BY_PATH[path]?.().catch(() => {})
}
