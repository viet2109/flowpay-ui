import { CaretRightIcon, PlusIcon, WebhooksLogoIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { RelativeTime } from '@/components/relative-time'
import { EmptyState, ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { TableSkeleton } from '@/components/ui/skeleton'
import { endpointStatus } from '../catalog'
import { EndpointFormDialog } from '../components/EndpointFormDialog'
import { EndpointUrl } from '../components/EndpointUrl'
import { WebhooksTabs } from '../components/WebhooksTabs'
import { useDeliveryCounts, useEndpoints } from '../queries'
import type { WebhookEndpoint } from '../types'

export function WebhooksPage() {
  const [creating, setCreating] = useState(false)
  const { data, isPending, error, refetch } = useEndpoints()

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Get notified when payments and refunds change state. Each request is signed with HMAC-SHA256."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon weight="bold" />
            Add endpoint
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
            title="No endpoints yet"
            action={
              <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
                Add your first endpoint
              </Button>
            }
          >
            Point FlowPay at a URL on your server to receive payment and refund events.
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

function EndpointRow({ endpoint }: { endpoint: WebhookEndpoint }) {
  const active = endpoint.status === 'ACTIVE'
  // Only active endpoints can still be fixed and retried, so only they get the warning.
  const { counts } = useDeliveryCounts(active ? endpoint.id : undefined, ['DEAD'])
  const dead = active ? counts.DEAD : 0

  return (
    <li>
      <Link
        to={`/developers/webhooks/${endpoint.id}`}
        className="group flex items-center gap-4 px-4 py-3.5 hover:bg-surface-hover"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <EndpointUrl url={endpoint.url} muted={!active} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
            <StatusBadge {...endpointStatus[endpoint.status]} />
            <span className="num">
              {endpoint.events.length} event{endpoint.events.length === 1 ? '' : 's'}
            </span>
            <span>
              updated <RelativeTime value={endpoint.updatedAt} />
            </span>
            {dead > 0 && (
              <span className="num font-medium text-danger">
                {dead} dead deliver{dead === 1 ? 'y' : 'ies'}
              </span>
            )}
          </div>
        </div>
        <CaretRightIcon className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  )
}
