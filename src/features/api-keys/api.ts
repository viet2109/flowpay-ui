import { request } from '@/lib/api/http'
import type { Instant } from '@/lib/api/types'

export type ApiKeyStatus = 'ACTIVE' | 'REVOKED'

export interface ApiKey {
  id: string
  name: string
  prefix: string
  status: ApiKeyStatus
  createdAt: Instant
}

/** Only the create response carries the raw `key` (BR-KEY-002). */
export interface CreatedApiKey extends ApiKey {
  key: string
}

/** docs/api-contract.md §9 — dashboard JWT. */
export const apiKeysApi = {
  list: (signal?: AbortSignal) => request<ApiKey[]>('/merchant/api-keys', { signal }).then((r) => r.data),
  create: (name: string) =>
    request<CreatedApiKey>('/merchant/api-keys', { method: 'POST', body: { name } }).then((r) => r.data),
  revoke: (id: string) => request<void>(`/merchant/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
