import { cn } from '@/lib/cn'
import { RETRY_SCHEDULE } from '../catalog'
import type { WebhookDeliveryDetail } from '../types'

/** Six automatic slots (now, 10s, 30s, 2m, 10m, 1h); manual retries extend past them. */
export function RetryTrack({ delivery }: { delivery: WebhookDeliveryDetail }) {
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
                        ? 'hatch text-warning'
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
