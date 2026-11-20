import { CaretRightIcon, PlusIcon, WarningIcon, WebhooksLogoIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CopyableId } from '@/components/copyable-id'
import { PageHeader } from '@/components/page-header'
import { RelativeTime } from '@/components/relative-time'
import { EmptyState, ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { isApiError } from '@/lib/api/errors'
import { deliveryStatus, endpointStatus } from '../catalog'
import { HttpResult } from '../components/DeliveriesTable'
import { EndpointFormDialog } from '../components/EndpointFormDialog'
import { EndpointUrl } from '../components/EndpointUrl'
import { WebhooksTabs } from '../components/WebhooksTabs'
import { useEndpointHealth, useEndpoints } from '../queries'
import type { WebhookEndpoint } from '../types'

export function WebhooksPage() {
  const { t } = useTranslation('webhooks')
  const [creating, setCreating] = useState(false)
  const { data, isPending, error, refetch } = useEndpoints()

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon weight="bold" />
            {t('addEndpoint')}
          </Button>
        }
      >
        <WebhooksTabs />
      </PageHeader>

      <Panel>
        {isPending ? (
          <TableSkeleton rows={3} columns={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<WebhooksLogoIcon />}
            title={t('empty.title')}
            action={
              <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
                {t('empty.action')}
              </Button>
            }
          >
            {t('empty.body')}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {data.map((endpoint) => (
              <EndpointRow key={endpoint.id} endpoint={endpoint} />
            ))}
          </ul>
        )}
      </Panel>

      <EndpointFormDialog open={creating} onOpenChange={setCreating} />
    </>
  )
}

/**
 * The URL is the row's link, stretched over the whole row; the health line's
 * own links and buttons sit above it, so nothing interactive is nested in a link.
 */
function EndpointRow({ endpoint }: { endpoint: WebhookEndpoint }) {
  const { t } = useTranslation('webhooks')
  const active = endpoint.status === 'ACTIVE'

  return (
    <li className="relative flex items-start gap-4 px-4 py-3.5 hover:bg-surface-hover">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Link
          to={`/developers/webhooks/${endpoint.id}`}
          className="peer flex min-w-0 outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
        >
          <EndpointUrl url={endpoint.url} muted={!active} />
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          <StatusBadge {...endpointStatus[endpoint.status]} />
          <span className="num">{t('endpoint.events', { count: endpoint.events.length })}</span>
          <span>
            {t('endpoint.updated')} <RelativeTime value={endpoint.updatedAt} />
          </span>
        </div>
        {/* A disabled endpoint gets no deliveries and its dead ones cannot be retried. */}
        {active ? (
          <EndpointHealth endpointId={endpoint.id} />
        ) : (
          <p className="text-xs text-ink-3">{t('endpoint.disabled')}</p>
        )}
      </div>
      <CaretRightIcon className="mt-0.5 size-4 shrink-0 text-ink-3 transition-transform peer-hover:translate-x-0.5" />
    </li>
  )
}

function EndpointHealth({ endpointId }: { endpointId: string }) {
  const { t } = useTranslation('webhooks')
  const { t: tc } = useTranslation('common')
  const { isPending, error, dead, retrying, latest, refetch } = useEndpointHealth(endpointId)
  const deliveries = (status: 'DEAD' | 'RETRYING') =>
    `/developers/webhooks/deliveries?endpointId=${endpointId}&status=${status}`

  if (isPending) return <Skeleton className="h-4 w-64 max-w-full" />

  if (error) {
    const requestId = isApiError(error) ? error.requestId : undefined
    return (
      <div className="relative z-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
        <WarningIcon className="size-3.5 text-danger" />
        <span>{t('health.unavailable')}</span>
        {requestId && (
          <span className="flex items-center gap-1 text-ink-3">
            {tc('errorState.request')} <CopyableId value={requestId} truncate={false} />
          </span>
        )}
        <Button size="sm" variant="link" onClick={refetch}>
          {tc('errorState.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
      {latest ? (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-ink-3">
            {t('health.lastDelivery')} <RelativeTime value={latest.deliveredAt ?? latest.updatedAt} />
          </span>
          <StatusBadge {...deliveryStatus[latest.status]} />
          {/* The HTTP status, or why there was none (e.g. TRANSPORT_FAILURE when nothing answered). */}
          {(latest.lastHttpStatus !== null || latest.lastError) && (
            <HttpResult status={latest.lastHttpStatus} error={latest.lastError} />
          )}
        </span>
      ) : (
        <span className="text-ink-3">{t('health.noDeliveries')}</span>
      )}
      {retrying > 0 && (
        <Link
          to={deliveries('RETRYING')}
          className="num relative z-10 font-medium text-warning hover:underline"
        >
          {t('health.retrying', { count: retrying })}
        </Link>
      )}
      {dead > 0 && (
        <Link to={deliveries('DEAD')} className="num relative z-10 font-medium text-danger hover:underline">
          {t('health.dead', { count: dead })}
        </Link>
      )}
    </div>
  )
}
