import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { EASE_OUT } from '@/lib/motion'
import { cn } from '@/lib/cn'
import { useFormat } from '@/i18n'
import { buildSteps, type LifecycleTimes } from '../lifecycle'
import type { PaymentStatus } from '../types'

/**
 * The PaymentIntent state machine drawn as a rail (backend payment state rules):
 *   CREATED -> PROCESSING -> SUCCEEDED -> PARTIALLY_REFUNDED -> REFUNDED
 *                         -> FAILED
 * Merchants see where the payment is and what can still happen to it. Only steps
 * that happened carry a time (lifecycle.ts says where each one comes from).
 */
const toneDot = {
  ink: 'bg-ink',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  refund: 'bg-refund',
}
const toneText = {
  ink: 'text-ink',
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  refund: 'text-refund',
}

export function LifecycleRail({ status, times }: { status: PaymentStatus; times: LifecycleTimes }) {
  const { t } = useTranslation('payments')
  const { t: tStatus } = useTranslation('status')
  const fmt = useFormat()
  const steps = buildSteps(status, times)

  return (
    <ol
      className="grid"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label={t('detail.lifecycle')}
    >
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <li
            key={step.key}
            className="relative pr-3"
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            {!isLast && (
              <div className="absolute top-[5px] right-0 left-4 h-px bg-line-strong">
                <m.div
                  className="h-px origin-left bg-ink"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: step.state === 'done' ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: i * 0.12, ease: EASE_OUT }}
                />
              </div>
            )}
            <span className="relative flex size-[11px] items-center justify-center">
              {step.state === 'current' && (
                <span className={cn('absolute inset-[-4px] rounded-full opacity-20', toneDot[step.tone])} />
              )}
              <span
                className={cn(
                  'size-[11px] rounded-full border-2',
                  step.state === 'upcoming' && 'border-dashed border-line-strong bg-surface',
                  step.state === 'done' && 'border-ink bg-ink',
                  step.state === 'current' && cn('border-transparent', toneDot[step.tone]),
                )}
              />
            </span>
            <div
              className={cn(
                'mt-2 text-sm',
                step.state === 'upcoming'
                  ? 'text-ink-3'
                  : step.state === 'current'
                    ? cn('font-medium', toneText[step.tone])
                    : 'text-ink',
              )}
            >
              {tStatus(step.label)}
            </div>
            <div className="num text-xs text-ink-3">
              {step.at ? (
                <time dateTime={step.at} title={fmt.dateTime(step.at)}>
                  {fmt.shortDate(step.at)}
                </time>
              ) : (
                ' '
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
