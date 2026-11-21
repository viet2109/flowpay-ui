import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
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
import { isApiError } from '@/lib/api/errors'
import { useErrorMessage, useFormat } from '@/i18n'
import { deliveryStatus } from '../catalog'
import { useDelivery, useEndpoints, useRetryDelivery } from '../queries'
import { AttemptTimeline } from './AttemptTimeline'
import { RetryTrack } from './RetryTrack'

export function DeliverySheet({ deliveryId, onClose }: { deliveryId: string | null; onClose: () => void }) {
  const { t } = useTranslation('webhooks')
  const errorMessage = useErrorMessage()
  const fmt = useFormat()
  const { data, isPending, error, refetch } = useDelivery(deliveryId)
  const endpoints = useEndpoints()
  const retry = useRetryDelivery()
  const endpoint = endpoints.data?.find((e) => e.id === data?.endpointId)
  const canRetry = data?.status === 'DEAD' && endpoint?.status === 'ACTIVE'

  function runRetry() {
    if (!data) return
    retry.mutate(data.id, {
      onSuccess: () =>
        toast.success(t('sheet.retryScheduled'), { description: t('sheet.retryScheduledBody') }),
      onError: (e) => toast.error(errorMessage(e)),
    })
  }

  return (
    <Sheet
      open={Boolean(deliveryId)}
      onOpenChange={(open) => !open && onClose()}
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
      {isPending ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        // Asking again for a delivery that does not exist cannot help.
        <ErrorState
          error={error}
          onRetry={isApiError(error, 'WEBHOOK_DELIVERY_NOT_FOUND') ? undefined : refetch}
        />
      ) : (
        <div className="space-y-6 p-5">
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
              {endpoint?.status === 'ACTIVE' ? t('sheet.fixThenRetry') : t('sheet.cannotRetry')}
            </Callout>
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
                    {endpoint?.url ?? data.endpointId}
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
