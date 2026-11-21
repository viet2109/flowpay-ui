import { Trans, useTranslation } from 'react-i18next'
import { RelativeTime } from '@/components/relative-time'
import { cn } from '@/lib/cn'
import { attemptOutcome, attemptTone, MAX_AUTOMATIC_ATTEMPTS, RETRY_SCHEDULE } from '../catalog'
import type { WebhookDeliveryDetail } from '../types'

const slotClass = {
  progress: 'bg-progress',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
} as const

/**
 * Six automatic slots (now, then the base delays); manual retries extend past
 * them. The summary line carries the meaning; the bars are a picture of it.
 */
export function RetryTrack({ delivery }: { delivery: WebhookDeliveryDetail }) {
  const { t } = useTranslation('webhooks')
  const slots = Math.max(MAX_AUTOMATIC_ATTEMPTS, delivery.attemptCount + (delivery.nextAttemptAt ? 1 : 0))
  const byNo = new Map(delivery.attempts.map((a) => [a.attemptNo, a]))

  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-2">
        <TrackSummary delivery={delivery} />
      </p>
      <div className="flex items-start gap-1" aria-hidden>
        {Array.from({ length: slots }, (_, i) => {
          const attempt = byNo.get(i + 1)
          const isNext = !attempt && i === delivery.attemptCount && delivery.nextAttemptAt !== null
          const label = i === 0 ? t('track.now') : (RETRY_SCHEDULE[i] ?? t('track.manual'))
          return (
            <div key={i} className="min-w-0 flex-1">
              <div
                className={cn(
                  'h-1.5 rounded-full',
                  attempt
                    ? slotClass[attemptTone[attemptOutcome(attempt)]]
                    : isNext
                      ? 'hatch text-warning'
                      : 'bg-surface-sunken',
                )}
              />
              <div className="num mt-1 truncate font-mono text-2xs text-ink-3">{label}</div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-ink-3">{t('track.jitter')}</p>
    </div>
  )
}

function TrackSummary({ delivery }: { delivery: WebhookDeliveryDetail }) {
  const { t } = useTranslation('webhooks')
  const next = delivery.nextAttemptAt
  const time = next ? <RelativeTime value={next} /> : <span />
  switch (delivery.status) {
    case 'PENDING':
      return <Trans t={t} i18nKey="track.pending" components={{ time }} />
    case 'DELIVERING':
      return t('track.delivering', { n: delivery.attemptCount })
    case 'DELIVERED':
      return t('track.delivered', { n: delivery.attemptCount })
    case 'RETRYING':
      // A retry past the automatic budget was asked for by hand.
      return delivery.attemptCount >= MAX_AUTOMATIC_ATTEMPTS ? (
        <Trans t={t} i18nKey="track.manualScheduled" components={{ time }} />
      ) : (
        <Trans
          t={t}
          i18nKey="track.retrying"
          count={delivery.attemptCount}
          values={{ max: MAX_AUTOMATIC_ATTEMPTS }}
          components={{ time }}
        />
      )
    case 'DEAD':
      return t('track.dead', { count: delivery.attemptCount })
  }
}
