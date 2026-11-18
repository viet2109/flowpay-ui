import { request, requestPage } from '@/lib/api/http'
import type {
  CreatedEndpoint,
  DeliveryFilters,
  EndpointInput,
  RotatedSecret,
  WebhookDelivery,
  WebhookDeliveryDetail,
  WebhookEndpoint,
} from './types'

const enc = encodeURIComponent

/** docs/api-contract.md §13–14 — dashboard JWT. */
export const webhooksApi = {
  endpoints: (signal?: AbortSignal) =>
    request<WebhookEndpoint[]>('/merchant/webhook-endpoints', { signal }).then((r) => r.data),

  endpoint: (id: string, signal?: AbortSignal) =>
    request<WebhookEndpoint>(`/merchant/webhook-endpoints/${enc(id)}`, { signal }).then((r) => r.data),

  create: (input: EndpointInput) =>
    request<CreatedEndpoint>('/merchant/webhook-endpoints', { method: 'POST', body: input }).then(
      (r) => r.data,
    ),

  /** PATCH: send only changed fields; `events` replaces the whole set. */
  update: (id: string, patch: Partial<EndpointInput>) =>
    request<WebhookEndpoint>(`/merchant/webhook-endpoints/${enc(id)}`, { method: 'PATCH', body: patch }).then(
      (r) => r.data,
    ),

  /** Soft disable. Pending/retrying deliveries become DEAD (ENDPOINT_DISABLED). Not reversible. */
  disable: (id: string) => request<void>(`/merchant/webhook-endpoints/${enc(id)}`, { method: 'DELETE' }),

  rotateSecret: (id: string) =>
    request<RotatedSecret>(`/merchant/webhook-endpoints/${enc(id)}/rotate-secret`, { method: 'POST' }).then(
      (r) => r.data,
    ),

  deliveries: (filters: DeliveryFilters, signal?: AbortSignal) =>
    requestPage<WebhookDelivery>('/merchant/webhook-deliveries', { signal, query: { ...filters } }),

  delivery: (id: string, signal?: AbortSignal) =>
    request<WebhookDeliveryDetail>(`/merchant/webhook-deliveries/${enc(id)}`, { signal }).then((r) => r.data),

  /** 202: schedules one more attempt for a DEAD delivery. No HTTP is sent inline. */
  retry: (id: string) =>
    request<WebhookDelivery>(`/merchant/webhook-deliveries/${enc(id)}/retry`, { method: 'POST' }).then(
      (r) => r.data,
    ),
}
