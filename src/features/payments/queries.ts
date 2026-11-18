import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTestKey } from '@/features/test-mode'
import { paymentsApi } from './api'
import {
  PAYMENT_STATUSES,
  type CreatePaymentInput,
  type CreateRefundInput,
  type PaymentFilters,
} from './types'

/**
 * Query keys include the connected key, so switching keys (= possibly another
 * merchant) can never show cached data from the previous one.
 */
export const paymentKeys = {
  all: (key: string | null) => ['payments', key] as const,
  list: (key: string | null, filters: PaymentFilters) => [...paymentKeys.all(key), 'list', filters] as const,
  detail: (key: string | null, id: string) => [...paymentKeys.all(key), 'detail', id] as const,
  transactions: (key: string | null, id: string) => [...paymentKeys.detail(key, id), 'transactions'] as const,
  refunds: (key: string | null, id: string, page: number) =>
    [...paymentKeys.detail(key, id), 'refunds', page] as const,
  refund: (key: string | null, refundId: string) => [...paymentKeys.all(key), 'refund', refundId] as const,
  statusCount: (key: string | null, status: string) => [...paymentKeys.all(key), 'count', status] as const,
}

const useKey = () => useTestKey((s) => s.key)

export function usePayments(filters: PaymentFilters) {
  const key = useKey()
  return useQuery({
    queryKey: paymentKeys.list(key, filters),
    queryFn: ({ signal }) => paymentsApi.list(filters, signal),
    enabled: Boolean(key),
    placeholderData: keepPreviousData, // keep the table steady while paging/filtering
  })
}

export function usePayment(id: string) {
  const key = useKey()
  return useQuery({
    queryKey: paymentKeys.detail(key, id),
    queryFn: ({ signal }) => paymentsApi.get(id, signal),
    enabled: Boolean(key),
    // A PROCESSING payment may still change; poll gently while someone is looking at it.
    refetchInterval: (query) => (query.state.data?.status === 'PROCESSING' ? 5_000 : false),
  })
}

export function usePaymentTransactions(id: string) {
  const key = useKey()
  return useQuery({
    queryKey: paymentKeys.transactions(key, id),
    queryFn: ({ signal }) => paymentsApi.transactions(id, signal),
    enabled: Boolean(key),
  })
}

export function usePaymentRefunds(id: string, page = 0) {
  const key = useKey()
  return useQuery({
    queryKey: paymentKeys.refunds(key, id, page),
    queryFn: ({ signal }) => paymentsApi.refunds(id, { page, size: 20 }, signal),
    enabled: Boolean(key),
    placeholderData: keepPreviousData,
  })
}

export function useRefund(refundId: string | null) {
  const key = useKey()
  return useQuery({
    queryKey: paymentKeys.refund(key, refundId ?? ''),
    queryFn: ({ signal }) => paymentsApi.refund(refundId!, signal),
    enabled: Boolean(key && refundId),
  })
}

/**
 * Counts per status, read from `totalElements` of a size=1 page. There is no
 * aggregate endpoint, so this is N tiny requests; fine for six statuses.
 */
export function usePaymentStatusCounts() {
  const key = useKey()
  return useQueries({
    queries: PAYMENT_STATUSES.map((status) => ({
      queryKey: paymentKeys.statusCount(key, status),
      queryFn: ({ signal }: { signal: AbortSignal }) => paymentsApi.list({ status, size: 1 }, signal),
      enabled: Boolean(key),
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
  const key = useKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { input: CreatePaymentInput; createKey: string; confirmKey?: string }) => {
      const created = await paymentsApi.create(vars.input, vars.createKey)
      const confirmed = vars.confirmKey ? await paymentsApi.confirm(created.data.id, vars.confirmKey) : null
      return { created, confirmed }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all(key) }),
  })
}

export function useConfirmPayment(paymentId: string) {
  const key = useKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idempotencyKey: string) => paymentsApi.confirm(paymentId, idempotencyKey),
    onSettled: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all(key) }),
  })
}

export function useCreateRefund(paymentId: string) {
  const key = useKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { input: CreateRefundInput; idempotencyKey: string }) =>
      paymentsApi.createRefund(paymentId, vars.input, vars.idempotencyKey),
    onSettled: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all(key) }),
  })
}
