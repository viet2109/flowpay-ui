import { request } from '@/lib/api/http'
import type { Instant } from '@/lib/api/types'

export type MerchantStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export interface Merchant {
  id: string
  name: string
  status: MerchantStatus
  createdAt: Instant
}

/** docs/api-contract.md §8 — dashboard JWT. */
export const merchantApi = {
  get: (signal?: AbortSignal) => request<Merchant>('/merchant', { signal }).then((r) => r.data),
  update: (name: string) =>
    request<Merchant>('/merchant', { method: 'PATCH', body: { name } }).then((r) => r.data),
}
