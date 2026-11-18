import { request, requestPage } from '@/lib/api/http'
import type { PageParams } from '@/lib/api/types'
import type {
  ConfirmResult,
  CreatedPaymentIntent,
  CreatePaymentInput,
  CreateRefundInput,
  PaymentFilters,
  PaymentIntent,
  PaymentTransaction,
  Refund,
} from './types'

/**
 * Merchant API (docs/api-contract.md §11–12). Authenticated with the connected
 * test key. To move to dashboard JWT later, change `auth` here and nothing else.
 */
const auth = 'merchant' as const

export const paymentsApi = {
  list: (filters: PaymentFilters, signal?: AbortSignal) =>
    requestPage<PaymentIntent>('/payment-intents', { auth, signal, query: { ...filters } }),

  get: (id: string, signal?: AbortSignal) =>
    request<PaymentIntent>(`/payment-intents/${encodeURIComponent(id)}`, { auth, signal }).then(
      (r) => r.data,
    ),

  transactions: (id: string, signal?: AbortSignal) =>
    request<PaymentTransaction[]>(`/payment-intents/${encodeURIComponent(id)}/transactions`, {
      auth,
      signal,
    }).then((r) => r.data),

  /** 201 Created. A replay returns the same payment with `replayed: true`. */
  create: (input: CreatePaymentInput, idempotencyKey: string) =>
    request<CreatedPaymentIntent>('/payment-intents', { auth, method: 'POST', body: input, idempotencyKey }),

  /** 200 = final outcome (SUCCEEDED or FAILED), 202 = provider outcome UNKNOWN. */
  confirm: (id: string, idempotencyKey: string) =>
    request<ConfirmResult>(`/payment-intents/${encodeURIComponent(id)}/confirm`, {
      auth,
      method: 'POST',
      idempotencyKey,
    }),

  refunds: (paymentId: string, params: PageParams, signal?: AbortSignal) =>
    requestPage<Refund>(`/payment-intents/${encodeURIComponent(paymentId)}/refunds`, {
      auth,
      signal,
      query: { ...params },
    }),

  refund: (refundId: string, signal?: AbortSignal) =>
    request<Refund>(`/refunds/${encodeURIComponent(refundId)}`, { auth, signal }).then((r) => r.data),

  /** 201 with SUCCEEDED/FAILED, or 202 with PROCESSING when the provider outcome is unknown. */
  createRefund: (paymentId: string, input: CreateRefundInput, idempotencyKey: string) =>
    request<Refund>(`/payment-intents/${encodeURIComponent(paymentId)}/refunds`, {
      auth,
      method: 'POST',
      body: input,
      idempotencyKey,
    }),
}
