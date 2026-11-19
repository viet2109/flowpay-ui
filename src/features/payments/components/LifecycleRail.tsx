import { m } from 'motion/react'
import { EASE_OUT } from '@/lib/motion'
import { cn } from '@/lib/cn'
import { useFormat } from '@/i18n'
import type { PaymentStatus } from '../types'

/**
 * The PaymentIntent state machine drawn as a rail (backend payment state rules):
 *   CREATED -> PROCESSING -> SUCCEEDED -> PARTIALLY_REFUNDED -> REFUNDED
 *                         -> FAILED
 * Merchants see where the payment is and what can still happen to it.
 */
type StepState = 'done' | 'current' | 'upcoming'
interface Step {
  label: string
  state: StepState
  tone: 'ink' | 'success' | 'danger' | 'warning' | 'refund'
  at?: string | null
}

interface Props {
  status: PaymentStatus
  createdAt: string
  processingAt?: string | null
  settledAt?: string | null
}

function buildSteps({ status, createdAt, processingAt, settledAt }: Props): Step[] {
  const order: PaymentStatus[] = ['CREATED', 'PROCESSING', 'SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED']
  const index = status === 'FAILED' ? 2 : order.indexOf(status)
  const stateOf = (i: number): StepState => (i < index ? 'done' : i === index ? 'current' : 'upcoming')

  const head: Step[] = [
    { label: 'Created', state: stateOf(0), tone: 'ink', at: createdAt },
    { label: 'Processing', state: stateOf(1), tone: 'warning', at: processingAt },
  ]
  if (status === 'FAILED')
    return [...head, { label: 'Failed', state: 'current', tone: 'danger', at: settledAt }]

  return [
    ...head,
    { label: 'Succeeded', state: stateOf(2), tone: 'success', at: settledAt },
    {
      label:
        status === 'REFUNDED'
          ? 'Refunded'
          : status === 'PARTIALLY_REFUNDED'
            ? 'Partially refunded'
            : 'Refunded',
      state: index >= 3 ? 'current' : 'upcoming',
      tone: 'refund',
    },
  ]
}

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

export function LifecycleRail(props: Props) {
  const fmt = useFormat()
  const steps = buildSteps(props)

  return (
    <ol
      className="grid"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label="Payment lifecycle"
    >
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <li
            key={step.label}
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
              {step.label}
            </div>
            <div className="num text-xs text-ink-3">{step.at ? fmt.shortDate(step.at) : ' '}</div>
          </li>
        )
      })}
    </ol>
  )
}
