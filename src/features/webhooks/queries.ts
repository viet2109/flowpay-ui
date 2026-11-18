import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { webhooksApi } from './api'
import { DELIVERY_STATUSES, type DeliveryFilters, type DeliveryStatus, type EndpointInput } from './types'

export const webhookKeys = {
  endpoints: ['webhooks', 'endpoints'] as const,
  endpoint: (id: string) => ['webhooks', 'endpoints', id] as const,
  deliveries: ['webhooks', 'deliveries'] as const,
  deliveryList: (filters: DeliveryFilters) => ['webhooks', 'deliveries', 'list', filters] as const,
  delivery: (id: string) => ['webhooks', 'deliveries', 'detail', id] as const,
  deliveryCount: (status: DeliveryStatus, endpointId?: string) =>
    ['webhooks', 'deliveries', 'count', status, endpointId ?? 'all'] as const,
}

/** Deliveries in these states change on their own; keep their views fresh. */
const isMoving = (status: DeliveryStatus) =>
  status === 'PENDING' || status === 'DELIVERING' || status === 'RETRYING'

export function useEndpoints() {
  return useQuery({ queryKey: webhookKeys.endpoints, queryFn: ({ signal }) => webhooksApi.endpoints(signal) })
}

export function useEndpoint(id: string) {
  return useQuery({
    queryKey: webhookKeys.endpoint(id),
    queryFn: ({ signal }) => webhooksApi.endpoint(id, signal),
  })
}

export function useDeliveries(filters: DeliveryFilters) {
  return useQuery({
    queryKey: webhookKeys.deliveryList(filters),
    queryFn: ({ signal }) => webhooksApi.deliveries(filters, signal),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (query.state.data?.items.some((d) => isMoving(d.status)) ? 5_000 : false),
  })
}

export function useDelivery(id: string | null) {
  return useQuery({
    queryKey: webhookKeys.delivery(id ?? ''),
    queryFn: ({ signal }) => webhooksApi.delivery(id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data && isMoving(query.state.data.status) ? 3_000 : false),
  })
}

/** Delivery counts per status, from `totalElements` of size=1 pages. */
export function useDeliveryCounts(
  endpointId?: string,
  statuses: readonly DeliveryStatus[] = DELIVERY_STATUSES,
) {
  return useQueries({
    queries: statuses.map((status) => ({
      queryKey: webhookKeys.deliveryCount(status, endpointId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        webhooksApi.deliveries({ status, endpointId, size: 1 }, signal),
      staleTime: 30_000,
    })),
    combine: (results) => ({
      isPending: results.some((r) => r.isPending),
      error: results.find((r) => r.error)?.error ?? null,
      counts: Object.fromEntries(
        statuses.map((s, i) => [s, results[i]?.data?.meta.totalElements ?? 0]),
      ) as Record<DeliveryStatus, number>,
    }),
  })
}

function useInvalidateWebhooks() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['webhooks'] })
}

export function useCreateEndpoint() {
  const invalidate = useInvalidateWebhooks()
  return useMutation({ mutationFn: webhooksApi.create, onSettled: invalidate })
}

export function useUpdateEndpoint(id: string) {
  const invalidate = useInvalidateWebhooks()
  return useMutation({
    mutationFn: (patch: Partial<EndpointInput>) => webhooksApi.update(id, patch),
    onSettled: invalidate,
  })
}

export function useDisableEndpoint() {
  const invalidate = useInvalidateWebhooks()
  return useMutation({ mutationFn: webhooksApi.disable, onSettled: invalidate })
}

export function useRotateSecret() {
  const invalidate = useInvalidateWebhooks()
  return useMutation({ mutationFn: webhooksApi.rotateSecret, onSettled: invalidate })
}

export function useRetryDelivery() {
  const invalidate = useInvalidateWebhooks()
  return useMutation({ mutationFn: webhooksApi.retry, onSettled: invalidate })
}
