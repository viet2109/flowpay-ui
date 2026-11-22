import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from './api'
import {
  PAYMENT_STATUSES,
  type CreatePaymentInput,
  type CreateRefundInput,
  type PaymentFilters,
  type PaymentIntent,
} from './types'

/**
 * The merchant is the session's (JWT `merchant` claim); the whole query cache is
 * cleared when a session ends (app/http-setup.ts), so keys need no merchant part.
 */
export const paymentKeys = {
  all: ['payments'] as const,
  list: (filters: PaymentFilters) => [...paymentKeys.all, 'list', filters] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
  /** `version`: the payment's updatedAt, so attempts are read again whenever the payment changes. */
  transactions: (id: string, version?: string) =>
    [...paymentKeys.detail(id), 'transactions', version] as const,
  refunds: (id: string, page: number) => [...paymentKeys.detail(id), 'refunds', page] as const,
  refund: (refundId: string) => [...paymentKeys.all, 'refund', refundId] as const,
  statusCount: (status: string) => [...paymentKeys.all, 'count', status] as const,
}

export function usePayments(filters: PaymentFilters) {
  return useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: ({ signal }) => paymentsApi.list(filters, signal),
    placeholderData: keepPreviousData, // keep the table steady while paging/filtering
  })
}

/**
 * How long to wait before reading a PROCESSING payment again, by how long it has
 * been PROCESSING (its updatedAt, set by the server when it entered that state, to
 * the moment of the last read). Quick at first, since a confirmation in flight
 * settles within seconds; slower after; none after two minutes. The backend has no
 * reconciliation: a payment whose provider outcome is UNKNOWN stays
 * PROCESSING, so polling forever would only cost requests.
 */
export const POLL_WINDOW_MS = 120_000

export function pollDelay(processingForMs: number): number | false {
  const elapsed = Math.max(0, processingForMs)
  if (elapsed >= POLL_WINDOW_MS) return false
  if (elapsed < 10_000) return 2_000
  if (elapsed < 30_000) return 5_000
  return 15_000
}

const processingFor = (payment: PaymentIntent, readAt: number) => readAt - Date.parse(payment.updatedAt)

export function usePayment(id: string) {
  const query = useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: ({ signal }) => paymentsApi.get(id, signal),
    refetchInterval: (q) => {
      const payment = q.state.data
      return payment?.status === 'PROCESSING'
        ? pollDelay(processingFor(payment, q.state.dataUpdatedAt))
        : false
    },
  })
  const { data, dataUpdatedAt } = query
  return {
    ...query,
    /** Still PROCESSING and no longer read automatically; a manual refetch reads once more. */
    pollingStopped: data?.status === 'PROCESSING' && pollDelay(processingFor(data, dataUpdatedAt)) === false,
  }
}

export function usePaymentTransactions(id: string, version?: string) {
  return useQuery({
    queryKey: paymentKeys.transactions(id, version),
    queryFn: ({ signal }) => paymentsApi.transactions(id, signal),
    // Moving to the next version keeps the current list on screen until the new one arrives.
    placeholderData: keepPreviousData,
  })
}

export function usePaymentRefunds(id: string, page = 0) {
  return useQuery({
    queryKey: paymentKeys.refunds(id, page),
    queryFn: ({ signal }) => paymentsApi.refunds(id, { page, size: 20 }, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * A refund, read again while PROCESSING on the same schedule as a payment
 * (pollDelay): a refund only stays PROCESSING when the provider outcome is unknown,
 * and without reconciliation it does not change on its own.
 */
export function useRefund(refundId: string | null) {
  return useQuery({
    queryKey: paymentKeys.refund(refundId ?? ''),
    queryFn: ({ signal }) => paymentsApi.refund(refundId!, signal),
    enabled: Boolean(refundId),
    refetchInterval: (q) => {
      const refund = q.state.data
      return refund?.status === 'PROCESSING'
        ? pollDelay(q.state.dataUpdatedAt - Date.parse(refund.updatedAt))
        : false
    },
  })
}

/**
 * Counts per status, read from `totalElements` of a size=1 page. There is no
 * aggregate endpoint, so this is N tiny requests; fine for six statuses.
 */
export function usePaymentStatusCounts() {
  return useQueries({
    queries: PAYMENT_STATUSES.map((status) => ({
      queryKey: paymentKeys.statusCount(status),
      queryFn: ({ signal }: { signal: AbortSignal }) => paymentsApi.list({ status, size: 1 }, signal),
      staleTime: 30_000,
    })),
    combine: (results) => ({
      isPending: results.some((r) => r.isPending),
      error: results.find((r) => r.error)?.error ?? null,
      counts: Object.fromEntries(
        PAYMENT_STATUSES.map((status, i) => [status, results[i]?.data?.meta.totalElements ?? 0]),
      ) as Record<(typeof PAYMENT_STATUSES)[number], number>,
    }),
  })
}

/** Create only; confirming is a separate step (useConfirmPayment), so a failed confirm never hides a created payment. */
export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { input: CreatePaymentInput; idempotencyKey: string }) =>
      paymentsApi.create(vars.input, vars.idempotencyKey),
    onSettled: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  })
}

/** Confirm a payment. The key belongs to that payment's confirmation, not to a click. */
export function useConfirmPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { paymentId: string; idempotencyKey: string }) =>
      paymentsApi.confirm(vars.paymentId, vars.idempotencyKey),
    onSettled: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  })
}

export function useCreateRefund(paymentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { input: CreateRefundInput; idempotencyKey: string }) =>
      paymentsApi.createRefund(paymentId, vars.input, vars.idempotencyKey),
    onSettled: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  })
}
