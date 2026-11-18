import { cn } from '@/lib/cn'

/**
 * Mark = two offset bars: a debit and a credit line of a ledger posting.
 * The second bar uses the simulator colour so the brand reads "test mode".
 */
export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
        <rect width="32" height="32" rx="7" className="fill-ink" />
        <rect x="7" y="9" width="12" height="4" rx="1" className="fill-canvas" />
        <rect x="13" y="19" width="12" height="4" rx="1" className="fill-sim" />
      </svg>
      {withWordmark && <span className="text-[0.95rem] font-semibold tracking-tight">FlowPay</span>}
    </span>
  )
}
