import { m } from 'motion/react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { useFormat } from '@/i18n'
import type { PaymentIntent } from '../types'

/**
 * Visualises the refund invariant the backend enforces under concurrency:
 *   refunded + reserved (in flight) + refundable = amount
 * "In flight" is derived: refunds created but not yet settled hold capacity.
 */
export function RefundCapacity({ payment }: { payment: PaymentIntent }) {
  const fmt = useFormat()
  const { amount, refundedAmount: refunded, refundableAmount: refundable, currency } = payment
  const settled =
    payment.status === 'SUCCEEDED' || payment.status === 'PARTIALLY_REFUNDED' || payment.status === 'REFUNDED'

  if (!settled) {
    return <p className="text-sm text-ink-3">Refunds become available once the payment has succeeded.</p>
  }

  const reserved = payment.status === 'REFUNDED' ? 0 : Math.max(0, amount - refunded - refundable)
  const pct = (v: number) => `${(v / amount) * 100}%`
  const segments = [
    { key: 'refunded', value: refunded, className: 'bg-refund' },
    { key: 'reserved', value: reserved, className: 'hatch text-warning' },
    { key: 'available', value: refundable, className: 'bg-success/80' },
  ].filter((s) => s.value > 0)

  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-sunken">
        {segments.map((s, i) => (
          <m.div
            key={s.key}
            className={s.className}
            initial={{ width: 0 }}
            animate={{ width: pct(s.value) }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: EASE_OUT }}
          />
        ))}
      </div>
      <dl className="num mt-3 grid grid-cols-3 gap-4 text-sm">
        <Legend dot="bg-refund" label="Refunded" value={fmt.money(refunded, currency)} />
        <Legend
          dot="hatch text-warning"
          label="In flight"
          value={fmt.money(reserved, currency)}
          muted={reserved === 0}
        />
        <Legend dot="bg-success" label="Refundable" value={fmt.money(refundable, currency)} />
      </dl>
    </div>
  )
}

function Legend({
  dot,
  label,
  value,
  muted,
}: {
  dot: string
  label: string
  value: string
  muted?: boolean
}) {
  // A zero share is quieter, but its text keeps full contrast (only the dot fades).
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-ink-3">
        <span className={cn('size-2 rounded-[2px]', dot, muted && 'opacity-40')} />
        {label}
      </dt>
      <dd className={cn('mt-0.5 font-medium', muted && 'font-normal text-ink-3')}>{value}</dd>
    </div>
  )
}
