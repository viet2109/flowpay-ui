import { auth } from './en/auth'
import { common } from './en/common'
import { errors } from './en/errors'
import { shell } from './en/shell'
import { status } from './en/status'
import { validation } from './en/validation'
import type { apiKeys } from './en/apiKeys'
import type { merchant } from './en/merchant'
import type { overview } from './en/overview'
import type { payments } from './en/payments'
import type { webhooks } from './en/webhooks'

/**
 * English is the source of truth for keys. The namespaces every screen needs (the
 * shell, sign-in, errors, statuses) are bundled in English; feature namespaces and
 * every other language are chunks loaded with the route that uses them
 * (./index.ts ensureMessages), so a visit only downloads what it shows.
 */
export const coreEn = { common, errors, shell, status, validation, auth }

/** Every namespace's English messages: the type all languages are checked against. */
export type Source = typeof coreEn & {
  merchant: typeof merchant
  overview: typeof overview
  webhooks: typeof webhooks
  apiKeys: typeof apiKeys
  payments: typeof payments
}
export type Namespace = keyof Source

export const CORE_NAMESPACES = Object.keys(coreEn) as Namespace[]
export const FEATURE_NAMESPACES: Namespace[] = ['merchant', 'overview', 'webhooks', 'apiKeys', 'payments']
export const NAMESPACES: Namespace[] = [...CORE_NAMESPACES, ...FEATURE_NAMESPACES]
