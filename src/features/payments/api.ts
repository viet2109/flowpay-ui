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
 * Dashboard payments and refunds (docs/api-contract.md §18), with the session's
 * JWT. Bodies, filters and status codes are those of the Merchant API (§11–12);
 * commands are OWNER only (403 ACCESS_DENIED before anything is written).
 */
const enc = encodeURIComponent

export const paymentsApi = {
  list: (filters: PaymentFilters, signal?: AbortSignal) =>
    requestPage<PaymentIntent>('/merchant/payments', { signal, query: { ...filters } }),

  get: (id: string, signal?: AbortSignal) =>
    request<PaymentIntent>(`/merchant/payments/${enc(id)}`, { signal }).then((r) => r.data),

  transactions: (id: string, signal?: AbortSignal) =>
    request<PaymentTransaction[]>(`/merchant/payments/${enc(id)}/transactions`, { signal }).then(
      (r) => r.data,
    ),

  /** 201 Created. A replay returns the same payment with `replayed: true`. */
  create: (input: CreatePaymentInput, idempotencyKey: string) =>
    request<CreatedPaymentIntent>('/merchant/payments', { method: 'POST', body: input, idempotencyKey }),

  /** 200 = final outcome (SUCCEEDED or FAILED), 202 = provider outcome UNKNOWN. */
  confirm: (id: string, idempotencyKey: string) =>
    request<ConfirmResult>(`/merchant/payments/${enc(id)}/confirm`, { method: 'POST', idempotencyKey }),

  refunds: (paymentId: string, params: PageParams, signal?: AbortSignal) =>
    requestPage<Refund>(`/merchant/payments/${enc(paymentId)}/refunds`, { signal, query: { ...params } }),

  refund: (refundId: string, signal?: AbortSignal) =>
    request<Refund>(`/merchant/refunds/${enc(refundId)}`, { signal }).then((r) => r.data),

  /** 201 with SUCCEEDED/FAILED, or 202 with PROCESSING when the provider outcome is unknown. */
  createRefund: (paymentId: string, input: CreateRefundInput, idempotencyKey: string) =>
    request<Refund>(`/merchant/payments/${enc(paymentId)}/refunds`, {
      method: 'POST',
      body: input,
      idempotencyKey,
    }),
}
