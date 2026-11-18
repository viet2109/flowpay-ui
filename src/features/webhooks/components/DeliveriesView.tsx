import { PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { useSearchParams } from 'react-router'
import { Pagination } from '@/components/pagination'
import { EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { TableSkeleton } from '@/components/ui/skeleton'
import { splitUrl } from '../catalog'
import { useDeliveries, useEndpoints } from '../queries'
import { DELIVERY_STATUSES, EVENT_TYPES, type DeliveryStatus, type EventType } from '../types'
import { DeliveriesTable } from './DeliveriesTable'
import { DeliverySheet } from './DeliverySheet'

const STATUS_OPTIONS: { value: DeliveryStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DEAD', label: 'Dead' },
  { value: 'RETRYING', label: 'Retrying' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DELIVERING', label: 'Delivering' },
]

/**
 * Delivery list with URL-backed filters (?status=DEAD&delivery=…). When
 * `endpointId` is fixed (endpoint detail page) the endpoint filter is hidden.
 */
export function DeliveriesView({ endpointId: fixedEndpoint }: { endpointId?: string }) {
  const [params, setParams] = useSearchParams()
  const status = DELIVERY_STATUSES.find((s) => s === params.get('status'))
  const eventType = EVENT_TYPES.find((e) => e === params.get('eventType'))
  const endpointId = fixedEndpoint ?? params.get('endpointId') ?? undefined
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0)
  const openDelivery = params.get('delivery')

  const endpoints = useEndpoints()
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useDeliveries({
    status,
    eventType,
    endpointId,
    page,
    size: 20,
  })

  function patch(next: Record<string, string | undefined>, resetPage = true) {
    const out = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) out.set(k, v)
      else out.delete(k)
    }
    if (resetPage && !('page' in next)) out.delete('page')
    setParams(out, { replace: true })
  }

  const isFiltered = Boolean(status || eventType || (!fixedEndpoint && endpointId))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 overflow-x-auto px-1">
          <Segmented
            aria-label="Filter by delivery status"
            value={status ?? 'ALL'}
            onChange={(v) => patch({ status: v === 'ALL' ? undefined : v })}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <NativeSelect
            aria-label="Event type"
            value={eventType ?? ''}
            onChange={(e) => patch({ eventType: (e.target.value as EventType) || undefined })}
            className="w-48 font-mono text-xs"
          >
            <option value="">All events</option>
            {EVENT_TYPES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </NativeSelect>
          {!fixedEndpoint && (
            <NativeSelect
              aria-label="Endpoint"
              value={endpointId ?? ''}
              onChange={(e) => patch({ endpointId: e.target.value || undefined })}
              className="w-56"
            >
              <option value="">All endpoints</option>
              {endpoints.data?.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {splitUrl(ep.url).host}
                  {splitUrl(ep.url).path}
                </option>
              ))}
            </NativeSelect>
          )}
        </div>
      </div>

      <div className={isPlaceholderData ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
        {isPending ? (
          <TableSkeleton columns={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<PaperPlaneTiltIcon />}
            title={isFiltered ? 'No deliveries match these filters' : 'No deliveries yet'}
            action={
              isFiltered && (
                <Button size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                  Clear filters
                </Button>
              )
            }
          >
            {!isFiltered &&
              'A delivery is created for each subscribed endpoint when a payment or refund event happens.'}
          </EmptyState>
        ) : (
          <>
            <DeliveriesTable deliveries={data.items} onSelect={(d) => patch({ delivery: d.id }, false)} />
            <Pagination
              meta={data.meta}
              onPageChange={(p) => patch({ page: String(p) }, false)}
              pending={isFetching}
            />
          </>
        )}
      </div>

      <DeliverySheet deliveryId={openDelivery} onClose={() => patch({ delivery: undefined }, false)} />
    </div>
  )
}
