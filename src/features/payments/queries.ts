import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from './api'
import {
  PAYMENT_STATUSES,
  type CreatePaymentInput,
  type CreateRefundInput,
  type PaymentFilters,
} from './types'

/**
 * The merchant is the session's (JWT `merchant` claim); the whole query cache is
 * cleared when a session ends (app/http-setup.ts), so keys need no merchant part.
 */
export const paymentKeys = {
  all: ['payments'] as const,
  list: (filters: PaymentFilters) => [...paymentKeys.all, 'list', filters] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
  transactions: (id: string) => [...paymentKeys.detail(id), 'transactions'] as const,
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

export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: ({ signal }) => paymentsApi.get(id, signal),
    // A PROCESSING payment may still change; poll gently while someone is looking at it.
    refetchInterval: (query) => (query.state.data?.status === 'PROCESSING' ? 5_000 : false),
  })
}

export function usePaymentTransactions(id: string) {
  return useQuery({
    queryKey: paymentKeys.transactions(id),
    queryFn: ({ signal }) => paymentsApi.transactions(id, signal),
  })
}

export function usePaymentRefunds(id: string, page = 0) {
  return useQuery({
    queryKey: paymentKeys.refunds(id, page),
    queryFn: ({ signal }) => paymentsApi.refunds(id, { page, size: 20 }, signal),
    placeholderData: keepPreviousData,
  })
}

export function useRefund(refundId: string | null) {
  return useQuery({
    queryKey: paymentKeys.refund(refundId ?? ''),
    queryFn: ({ signal }) => paymentsApi.refund(refundId!, signal),
    enabled: Boolean(refundId),
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

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { input: CreatePaymentInput; createKey: string; confirmKey?: string }) => {
      const created = await paymentsApi.create(vars.input, vars.createKey)
      const confirmed = vars.confirmKey ? await paymentsApi.confirm(created.data.id, vars.confirmKey) : null
      return { created, confirmed }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  })
}

export function useConfirmPayment(paymentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idempotencyKey: string) => paymentsApi.confirm(paymentId, idempotencyKey),
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
