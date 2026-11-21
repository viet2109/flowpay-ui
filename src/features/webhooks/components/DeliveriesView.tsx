import { PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/pagination'
import { EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { TableSkeleton } from '@/components/ui/skeleton'
import { deliveryStatus, splitUrl } from '../catalog'
import { useDeliveries, useEndpoints } from '../queries'
import { EVENT_TYPES, type DeliveryStatus } from '../types'
import { useDeliveryFilters } from '../use-delivery-filters'
import { DeliveriesTable } from './DeliveriesTable'
import { DeliverySheet } from './DeliverySheet'

/** Problem deliveries first: they are what people come here for. */
const STATUS_ORDER: DeliveryStatus[] = ['DEAD', 'RETRYING', 'DELIVERED', 'PENDING', 'DELIVERING']

/**
 * Delivery list with URL-backed filters and sheet (use-delivery-filters.ts). When
 * `endpointId` is fixed (endpoint detail page) the endpoint filter is hidden.
 */
export function DeliveriesView({ endpointId: fixedEndpoint }: { endpointId?: string }) {
  const { t } = useTranslation('webhooks')
  const { t: tStatus } = useTranslation('status')
  const filters = useDeliveryFilters(fixedEndpoint)
  const { status, eventType, urlEndpoint, isFiltered } = filters

  const endpoints = useEndpoints()
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useDeliveries(filters.apiFilters)
  // A link can name an endpoint that is not in the list (another merchant's, or a
  // typo): the backend then returns nothing, and the select must still show the filter.
  const unknownEndpoint =
    !fixedEndpoint && urlEndpoint && endpoints.data && !endpoints.data.some((e) => e.id === urlEndpoint)
  const pastEnd = data && data.items.length === 0 && data.meta.totalElements > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 overflow-x-auto px-1">
          <Segmented
            aria-label={t('deliveries.filterStatus')}
            value={status ?? 'ALL'}
            onChange={(v) => filters.update({ status: v === 'ALL' ? undefined : v })}
            options={[
              { value: 'ALL' as const, label: t('deliveries.all') },
              ...STATUS_ORDER.map((s) => ({ value: s, label: tStatus(deliveryStatus[s].label) })),
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <NativeSelect
            aria-label={t('deliveries.eventType')}
            value={eventType ?? ''}
            onChange={(e) => filters.update({ eventType: e.target.value })}
            className="w-48 font-mono text-xs"
          >
            <option value="">{t('deliveries.allEvents')}</option>
            {EVENT_TYPES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </NativeSelect>
          {!fixedEndpoint && (
            <NativeSelect
              aria-label={t('deliveries.endpoint')}
              value={urlEndpoint ?? ''}
              onChange={(e) => filters.update({ endpointId: e.target.value })}
              className="w-56"
            >
              <option value="">{t('deliveries.allEndpoints')}</option>
              {endpoints.data?.map((ep) => {
                const { host, path } = splitUrl(ep.url)
                const url = `${host}${path}`
                return (
                  <option key={ep.id} value={ep.id}>
                    {ep.status === 'DISABLED' ? t('deliveries.endpointDisabled', { url }) : url}
                  </option>
                )
              })}
              {unknownEndpoint && (
                <option value={urlEndpoint}>{t('deliveries.unknownEndpoint', { id: urlEndpoint })}</option>
              )}
            </NativeSelect>
          )}
        </div>
      </div>

      <div className={isPlaceholderData ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
        {isPending ? (
          <TableSkeleton columns={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : pastEnd ? (
          <EmptyState
            icon={<PaperPlaneTiltIcon />}
            title={t('deliveries.pastEndTitle')}
            action={
              <Button size="sm" onClick={() => filters.setPage(0)}>
                {t('deliveries.firstPage')}
              </Button>
            }
          >
            {t('deliveries.pastEndBody')}
          </EmptyState>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<PaperPlaneTiltIcon />}
            title={isFiltered ? t('deliveries.filteredTitle') : t('deliveries.emptyTitle')}
            action={
              isFiltered && (
                <Button size="sm" onClick={filters.clear}>
                  {t('deliveries.clearFilters')}
                </Button>
              )
            }
          >
            {!isFiltered && t('deliveries.emptyBody')}
          </EmptyState>
        ) : (
          <>
            <DeliveriesTable deliveries={data.items} onSelect={(d) => filters.open(d.id)} />
            <Pagination meta={data.meta} onPageChange={filters.setPage} pending={isFetching} />
          </>
        )}
      </div>

      <DeliverySheet deliveryId={filters.openDelivery} onClose={filters.close} />
    </div>
  )
}
