import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Callout } from '@/components/callout'
import { CopyableId } from '@/components/copyable-id'
import { DescriptionList } from '@/components/description-list'
import { ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api/errors'
import { cn } from '@/lib/cn'
import { formatDateTime, formatDuration } from '@/lib/format'
import { deliveryStatus, EVENT_INFO, RETRY_SCHEDULE } from '../catalog'
import { useDelivery, useEndpoints, useRetryDelivery } from '../queries'
import type { DeliveryAttempt, WebhookDeliveryDetail } from '../types'
import { HttpResult } from './DeliveriesTable'

export function DeliverySheet({ deliveryId, onClose }: { deliveryId: string | null; onClose: () => void }) {
  const { data, isPending, error, refetch } = useDelivery(deliveryId)
  const endpoints = useEndpoints()
  const retry = useRetryDelivery()
  const endpoint = endpoints.data?.find((e) => e.id === data?.endpointId)
  const canRetry = data?.status === 'DEAD' && endpoint?.status === 'ACTIVE'

  function runRetry() {
    if (!data) return
    retry.mutate(data.id, {
      onSuccess: () =>
        toast.success('Retry scheduled', { description: 'The worker will send the next attempt shortly.' }),
      onError: (e) => toast.error(errorMessage(e)),
    })
  }

  return (
    <Sheet
      open={Boolean(deliveryId)}
      onOpenChange={(open) => !open && onClose()}
      eyebrow="Webhook delivery"
      title={data ? <span className="font-mono text-sm">{data.eventType}</span> : 'Loading…'}
      actions={
        canRetry && (
          <Button size="sm" variant="primary" onClick={runRetry} loading={retry.isPending}>
            <ArrowClockwiseIcon />
            Retry
          </Button>
        )
      }
    >
      {isPending ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div className="space-y-6 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge {...deliveryStatus[data.status]} />
            <span className="text-sm text-ink-2">{EVENT_INFO[data.eventType].description}</span>
          </div>

          {data.status === 'DEAD' && (
            <Callout
              tone="danger"
              title={
                data.lastError === 'ENDPOINT_DISABLED'
                  ? 'Cancelled: endpoint disabled'
                  : 'Automatic retries exhausted'
              }
            >
              {endpoint?.status === 'ACTIVE'
                ? 'Fix the receiver, then retry. A manual retry adds one attempt and keeps the full history.'
                : 'The endpoint is disabled, so this delivery cannot be retried.'}
            </Callout>
          )}

          <section>
            <h3 className="mb-3 text-xs font-medium text-ink-3">Retry schedule</h3>
            <RetryTrack delivery={data} />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-medium text-ink-3">Attempts</h3>
            {data.attempts.length === 0 ? (
              <p className="text-sm text-ink-3">No attempt has started yet.</p>
            ) : (
              <ol className="relative space-y-0 border-l border-line pl-4">
                {data.attempts.map((attempt) => (
                  <AttemptRow key={attempt.attemptNo} attempt={attempt} />
                ))}
              </ol>
            )}
          </section>

          <DescriptionList
            items={[
              { label: 'Delivery', value: <CopyableId value={data.id} truncate={false} /> },
              { label: 'Event ID', value: <CopyableId value={data.eventId} truncate={false} /> },
              {
                label: 'Resource',
                value:
                  data.resourceType === 'PAYMENT' ? (
                    <Link
                      to={`/payments/${data.resourceId}`}
                      className="font-mono text-xs text-accent hover:underline"
                    >
                      {data.resourceId}
                    </Link>
                  ) : (
                    <CopyableId value={data.resourceId} truncate={false} />
                  ),
              },
              {
                label: 'Endpoint',
                value: (
                  <Link
                    to={`/developers/webhooks/${data.endpointId}`}
                    className="font-mono text-xs text-accent hover:underline"
                  >
                    {endpoint?.url ?? data.endpointId}
                  </Link>
                ),
              },
              { label: 'Created', value: formatDateTime(data.createdAt) },
              { label: 'Delivered', value: formatDateTime(data.deliveredAt), hidden: !data.deliveredAt },
              {
                label: 'Next attempt',
                value: formatDateTime(data.nextAttemptAt),
                hidden: !data.nextAttemptAt,
              },
            ]}
          />
        </div>
      )}
    </Sheet>
  )
}

/** Six automatic slots (now, 10s, 30s, 2m, 10m, 1h); manual retries extend past them. */
function RetryTrack({ delivery }: { delivery: WebhookDeliveryDetail }) {
  const slots = Math.max(RETRY_SCHEDULE.length, delivery.attemptCount)
  const byNo = new Map(delivery.attempts.map((a) => [a.attemptNo, a]))

  return (
    <div className="flex items-start gap-1">
      {Array.from({ length: slots }, (_, i) => {
        const attempt = byNo.get(i + 1)
        const ok =
          attempt?.httpStatus !== undefined && attempt.httpStatus !== null && attempt.httpStatus < 300
        const failed = attempt && !ok && attempt.finishedAt
        const isNext = !attempt && i === delivery.attemptCount && delivery.nextAttemptAt
        return (
          <div key={i} className="flex-1">
            <div
              className={cn(
                'h-1.5 rounded-full',
                ok
                  ? 'bg-success'
                  : failed
                    ? 'bg-danger'
                    : attempt
                      ? 'bg-progress'
                      : isNext
                        ? 'hatch-sim'
                        : 'bg-surface-sunken',
              )}
            />
            <div className="num mt-1 font-mono text-2xs text-ink-3">{RETRY_SCHEDULE[i] ?? 'manual'}</div>
          </div>
        )
      })}
    </div>
  )
}

function AttemptRow({ attempt }: { attempt: DeliveryAttempt }) {
  const ok = attempt.httpStatus !== null && attempt.httpStatus >= 200 && attempt.httpStatus < 300
  return (
    <li className="relative pb-4 last:pb-0">
      <span
        className={cn(
          'absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-surface',
          ok ? 'bg-success' : attempt.finishedAt ? 'bg-danger' : 'bg-progress',
        )}
      />
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">
          Attempt <span className="num">#{attempt.attemptNo}</span>
        </span>
        <span className="num text-xs text-ink-3">{formatDateTime(attempt.startedAt)}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
        <HttpResult status={attempt.httpStatus} />
        <span>·</span>
        <span className="num">{formatDuration(attempt.durationMs)}</span>
      </div>
      {attempt.errorMessage && (
        <p className="mt-1 font-mono text-xs break-all text-danger">{attempt.errorMessage}</p>
      )}
    </li>
  )
}
