import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { webhooksApi } from './api'
import {
  DELIVERY_STATUSES,
  type DeliveryFilters,
  type DeliveryStatus,
  type EndpointInput,
  type WebhookDeliveryDetail,
} from './types'

export const webhookKeys = {
  endpoints: ['webhooks', 'endpoints'] as const,
  endpoint: (id: string) => ['webhooks', 'endpoints', id] as const,
  deliveries: ['webhooks', 'deliveries'] as const,
  deliveryList: (filters: DeliveryFilters) => ['webhooks', 'deliveries', 'list', filters] as const,
  delivery: (id: string) => ['webhooks', 'deliveries', 'detail', id] as const,
  deliveryCount: (status: DeliveryStatus, endpointId?: string) =>
    ['webhooks', 'deliveries', 'count', status, endpointId ?? 'all'] as const,
  latestDelivery: (endpointId: string) => ['webhooks', 'deliveries', 'latest', endpointId] as const,
}

/** Health on the endpoint list refreshes on its own; deliveries move without user action. */
const HEALTH_REFRESH_MS = 30_000

/** Deliveries in these states change on their own; keep their views fresh. */
const isMoving = (status: DeliveryStatus) =>
  status === 'PENDING' || status === 'DELIVERING' || status === 'RETRYING'

export function useEndpoints() {
  return useQuery({ queryKey: webhookKeys.endpoints, queryFn: ({ signal }) => webhooksApi.endpoints(signal) })
}

/** `id` may arrive later (e.g. from a delivery still loading); nothing is asked until then. */
export function useEndpoint(id: string | undefined) {
  return useQuery({
    queryKey: webhookKeys.endpoint(id ?? ''),
    queryFn: ({ signal }) => webhooksApi.endpoint(id!, signal),
    enabled: Boolean(id),
  })
}

/**
 * DEAD deliveries that a manual retry can actually reach: only those on ACTIVE
 * endpoints (a disabled endpoint cannot be re-enabled, so its dead deliveries stay
 * dead). No aggregate API: one size=1 count per active endpoint, sharing the
 * endpoint list's health cache.
 */
export function useRetryableDeadCount() {
  const endpoints = useEndpoints()
  const active = endpoints.data?.filter((e) => e.status === 'ACTIVE') ?? []
  return useQueries({
    queries: active.map((endpoint) => ({
      queryKey: webhookKeys.deliveryCount('DEAD', endpoint.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        webhooksApi.deliveries({ status: 'DEAD', endpointId: endpoint.id, size: 1 }, signal),
      staleTime: 30_000,
    })),
    combine: (results) => {
      const counts = active.map((endpoint, i) => ({
        endpointId: endpoint.id,
        count: results[i]?.data?.meta.totalElements ?? 0,
      }))
      return {
        isPending: endpoints.isPending || results.some((r) => r.isPending),
        count: counts.reduce((sum, c) => sum + c.count, 0),
        /** Active endpoints that have dead deliveries. */
        endpointIds: counts.filter((c) => c.count > 0).map((c) => c.endpointId),
      }
    },
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
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQueries({
    queries: statuses.map((status) => ({
      queryKey: webhookKeys.deliveryCount(status, endpointId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        webhooksApi.deliveries({ status, endpointId, size: 1 }, signal),
      staleTime: 30_000,
      enabled,
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

/**
 * One endpoint's delivery health: the deliveries that need action (DEAD can be
 * retried, RETRYING is failing right now) and the latest delivery (the list is
 * newest first). There is no aggregate API, so these are size=1 pages (D9).
 */
export function useEndpointHealth(endpointId: string) {
  return useQueries({
    queries: [
      {
        queryKey: webhookKeys.deliveryCount('DEAD', endpointId),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          webhooksApi.deliveries({ status: 'DEAD', endpointId, size: 1 }, signal),
        refetchInterval: HEALTH_REFRESH_MS,
      },
      {
        queryKey: webhookKeys.deliveryCount('RETRYING', endpointId),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          webhooksApi.deliveries({ status: 'RETRYING', endpointId, size: 1 }, signal),
        refetchInterval: HEALTH_REFRESH_MS,
      },
      {
        queryKey: webhookKeys.latestDelivery(endpointId),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          webhooksApi.deliveries({ endpointId, size: 1 }, signal),
        refetchInterval: (query: { state: { data?: { items: { status: DeliveryStatus }[] } } }) => {
          const latest = query.state.data?.items[0]
          return latest && isMoving(latest.status) ? 5_000 : HEALTH_REFRESH_MS
        },
      },
    ],
    combine: ([dead, retrying, latest]) => ({
      isPending: Boolean(dead?.isPending || retrying?.isPending || latest?.isPending),
      error: dead?.error ?? retrying?.error ?? latest?.error ?? null,
      dead: dead?.data?.meta.totalElements ?? 0,
      retrying: retrying?.data?.meta.totalElements ?? 0,
      latest: latest?.data?.items[0] ?? null,
      refetch: () => {
        void dead?.refetch()
        void retrying?.refetch()
        void latest?.refetch()
      },
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
  const queryClient = useQueryClient()
  const invalidate = useInvalidateWebhooks()
  return useMutation({
    mutationFn: webhooksApi.retry,
    // The 202 body is the rescheduled summary (RETRYING, next attempt now). Show it at
    // once so the Retry button goes away; attempt history is unchanged by a retry.
    onSuccess: (summary) =>
      queryClient.setQueryData<WebhookDeliveryDetail>(webhookKeys.delivery(summary.id), (old) =>
        old ? { ...old, ...summary } : old,
      ),
    onSettled: invalidate,
  })
}
