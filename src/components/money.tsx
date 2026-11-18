import { cn } from '@/lib/cn'
import { formatMinor } from '@/lib/money'

interface MoneyProps {
  /** Integer minor units, exactly as the API returns them. */
  amount: number
  currency: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Prefix with a minus sign (refunds). */
  negative?: boolean
  className?: string
}

const sizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl font-medium',
  xl: 'text-[2.25rem] leading-none font-medium tracking-tight',
}

/** Amount first, ISO code second and quieter: "500,000 VND". */
export function Money({ amount, currency, size = 'md', negative, className }: MoneyProps) {
  return (
    <span className={cn('num inline-flex items-baseline gap-1 whitespace-nowrap', sizes[size], className)}>
      <span>
        {negative && '−'}
        {formatMinor(amount, currency)}
      </span>
      <span className={cn('text-ink-3', size === 'xl' ? 'text-base font-normal' : 'text-[0.85em]')}>
        {currency}
      </span>
    </span>
  )
}
