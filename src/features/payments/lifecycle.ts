import type { StatusLabel } from '@/components/status-badge'
import type { PaymentIntent, PaymentStatus, PaymentTransaction, Refund } from './types'

/**
 * When each lifecycle step happened, from records that say so:
 *  - processing: the first provider attempt started;
 *  - succeeded / failed: the attempt with that outcome completed (an UNKNOWN attempt
 *    also has a completedAt, so "the latest attempt" would date a step that has not
 *    happened);
 *  - refunded: the succeeded refunds' completion times. Fully refunded: the last one.
 *    Partially refunded: the first one, known only when every refund is loaded
 *    (refunds are listed newest first; the payment's updatedAt also moves when a
 *    refund is only reserved, so it is no refund time).
 * A time that cannot be known is null rather than guessed.
 */
export interface LifecycleTimes {
  createdAt: string
  processingAt: string | null
  settledAt: string | null
  refundedAt: string | null
}

export function lifecycleTimes(
  payment: Pick<PaymentIntent, 'status' | 'createdAt'>,
  attempts: PaymentTransaction[] = [],
  refunds?: { items: Refund[]; complete: boolean },
): LifecycleTimes {
  const outcome = settledOutcome(payment.status)
  const settled = outcome ? attempts.filter((a) => a.status === outcome).at(-1) : undefined
  const refundTimes = (refunds?.items ?? [])
    .filter((r) => r.status === 'SUCCEEDED' && r.completedAt)
    .map((r) => r.completedAt!)
    .sort()

  let refundedAt: string | null = null
  if (payment.status === 'REFUNDED') refundedAt = refundTimes.at(-1) ?? null
  else if (payment.status === 'PARTIALLY_REFUNDED' && refunds?.complete) refundedAt = refundTimes[0] ?? null

  return {
    createdAt: payment.createdAt,
    processingAt: attempts[0]?.startedAt ?? null,
    settledAt: settled?.completedAt ?? null,
    refundedAt,
  }
}

function settledOutcome(status: PaymentStatus): 'SUCCEEDED' | 'FAILED' | null {
  if (status === 'FAILED') return 'FAILED'
  if (status === 'SUCCEEDED' || status === 'PARTIALLY_REFUNDED' || status === 'REFUNDED') return 'SUCCEEDED'
  return null
}

/**
 * The rail's steps for a status: CREATED -> PROCESSING -> SUCCEEDED -> PARTIALLY_REFUNDED
 * -> REFUNDED, or CREATED -> PROCESSING -> FAILED.
 */
export type StepState = 'done' | 'current' | 'upcoming'
export interface Step {
  key: string
  label: StatusLabel
  state: StepState
  tone: 'ink' | 'success' | 'danger' | 'warning' | 'refund'
  at: string | null
}

export function buildSteps(status: PaymentStatus, times: LifecycleTimes): Step[] {
  const order: PaymentStatus[] = ['CREATED', 'PROCESSING', 'SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED']
  const index = status === 'FAILED' ? 2 : order.indexOf(status)
  const stateOf = (i: number): StepState => (i < index ? 'done' : i === index ? 'current' : 'upcoming')

  const head: Step[] = [
    { key: 'created', label: 'payment.CREATED', state: stateOf(0), tone: 'ink', at: times.createdAt },
    {
      key: 'processing',
      label: 'payment.PROCESSING',
      state: stateOf(1),
      tone: 'warning',
      at: times.processingAt,
    },
  ]
  const steps: Step[] =
    status === 'FAILED'
      ? [
          ...head,
          { key: 'failed', label: 'payment.FAILED', state: 'current', tone: 'danger', at: times.settledAt },
        ]
      : [
          ...head,
          {
            key: 'succeeded',
            label: 'payment.SUCCEEDED',
            state: stateOf(2),
            tone: 'success',
            at: times.settledAt,
          },
          {
            key: 'refunded',
            label: status === 'PARTIALLY_REFUNDED' ? 'payment.PARTIALLY_REFUNDED' : 'payment.REFUNDED',
            state: index >= 3 ? 'current' : 'upcoming',
            tone: 'refund',
            at: times.refundedAt,
          },
        ]
  // A step that has not happened has no time, whatever the records hold.
  return steps.map((step) => (step.state === 'upcoming' ? { ...step, at: null } : step))
}
