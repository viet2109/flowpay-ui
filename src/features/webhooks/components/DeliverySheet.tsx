import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Callout } from '@/components/callout'
import { CopyableId } from '@/components/copyable-id'
import { DescriptionList } from '@/components/description-list'
import { ActionError, ErrorState, RefreshFailed } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { isApiError } from '@/lib/api/errors'
import { useFormat } from '@/i18n'
import { deliveryStatus } from '../catalog'
import { useDelivery, useEndpoint, useRetryDelivery } from '../queries'
import type { WebhookEndpoint } from '../types'
import { AttemptTimeline } from './AttemptTimeline'
import { RetryTrack } from './RetryTrack'

export function DeliverySheet({ deliveryId, onClose }: { deliveryId: string | null; onClose: () => void }) {
  const { t } = useTranslation('webhooks')
  const fmt = useFormat()
  const { data, isPending, error, refetch } = useDelivery(deliveryId)
  // The endpoint itself, not the list: whether a retry is allowed must not depend
  // on another query having loaded.
  const endpoint = useEndpoint(data?.endpointId)
  const retry = useRetryDelivery()
  // docs/api-contract.md §14: manual retry only for a DEAD delivery whose endpoint is ACTIVE.
  const canRetry = data?.status === 'DEAD' && endpoint.data?.status === 'ACTIVE'

  function runRetry() {
    if (!data) return
    retry.mutate(data.id, {
      onSuccess: () =>
        toast.success(t('sheet.retryScheduled'), { description: t('sheet.retryScheduledBody') }),
    })
  }

  function close() {
    retry.reset()
    onClose()
  }

  return (
    <Sheet
      open={Boolean(deliveryId)}
      onOpenChange={(open) => !open && close()}
      eyebrow={t('sheet.eyebrow')}
      title={data ? <span className="font-mono text-sm">{data.eventType}</span> : t('sheet.loading')}
      actions={
        canRetry && (
          <Button size="sm" variant="primary" onClick={runRetry} loading={retry.isPending}>
            <ArrowClockwiseIcon />
            {t('sheet.retry')}
          </Button>
        )
      }
    >
      {isPending && !data ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !data ? (
        // Asking again for a delivery that does not exist cannot help.
        <ErrorState
          error={error}
          onRetry={isApiError(error, 'WEBHOOK_DELIVERY_NOT_FOUND') ? undefined : refetch}
        />
      ) : (
        <div className="space-y-6 p-5">
          {/* A failed refresh while polling keeps what was loaded instead of blanking it. */}
          {error && <RefreshFailed error={error} onRetry={refetch} />}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge {...deliveryStatus[data.status]} />
            <span className="text-sm text-ink-2">{t(`event.${data.eventType}`)}</span>
          </div>

          {data.status === 'DEAD' && (
            <Callout
              tone="danger"
              title={
                data.lastError === 'ENDPOINT_DISABLED' ? t('sheet.cancelledTitle') : t('sheet.exhaustedTitle')
              }
            >
              <RetryRule endpoint={endpoint} />
            </Callout>
          )}
          {retry.error && (
            <ActionError
              error={retry.error}
              // Someone else retried it, or the endpoint was disabled, since this loaded.
              message={
                isApiError(retry.error, 'WEBHOOK_INVALID_STATE') ? t('sheet.retryConflict') : undefined
              }
            />
          )}

          <section>
            <h3 className="mb-3 text-xs font-medium text-ink-3">{t('sheet.schedule')}</h3>
            <RetryTrack delivery={data} />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-medium text-ink-3">{t('sheet.attempts')}</h3>
            {data.attempts.length === 0 ? (
              <p className="text-sm text-ink-3">{t('sheet.noAttempts')}</p>
            ) : (
              <AttemptTimeline attempts={data.attempts} />
            )}
          </section>

          <DescriptionList
            items={[
              { label: t('sheet.delivery'), value: <CopyableId value={data.id} truncate={false} /> },
              { label: t('sheet.eventId'), value: <CopyableId value={data.eventId} truncate={false} /> },
              {
                label: t('sheet.resource'),
                value:
                  data.resourceType === 'PAYMENT_INTENT' ? (
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
                label: t('sheet.endpoint'),
                value: (
                  <Link
                    to={`/developers/webhooks/${data.endpointId}`}
                    className="font-mono text-xs text-accent hover:underline"
                  >
                    {endpoint.data?.url ?? data.endpointId}
                  </Link>
                ),
              },
              { label: t('sheet.created'), value: fmt.dateTime(data.createdAt) },
              {
                label: t('sheet.delivered'),
                value: fmt.dateTime(data.deliveredAt),
                hidden: !data.deliveredAt,
              },
              {
                label: t('sheet.nextAttempt'),
                value: fmt.dateTime(data.nextAttemptAt),
                hidden: !data.nextAttemptAt,
              },
            ]}
          />
        </div>
      )}
    </Sheet>
  )
}

/** Why a dead delivery can or cannot be retried, once the endpoint is known. */
function RetryRule({
  endpoint,
}: {
  endpoint: { data?: WebhookEndpoint; isPending: boolean; error: Error | null }
}) {
  const { t } = useTranslation('webhooks')
  if (endpoint.data?.status === 'ACTIVE') return t('sheet.fixThenRetry')
  if (endpoint.data) return t('sheet.cannotRetry')
  if (endpoint.error) return t('sheet.endpointUnknown')
  return <Skeleton className="mt-1 h-4 w-64" />
}
