import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

export type Tone = 'success' | 'danger' | 'warning' | 'refund' | 'progress' | 'neutral'

/** A status label key in the "status" namespace, e.g. "payment.SUCCEEDED". */
export type StatusLabel = ParseKeys<'status'>

const toneClass: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  refund: 'bg-refund-soft text-refund',
  progress: 'bg-progress-soft text-progress',
  neutral: 'bg-neutral-soft text-neutral',
}

interface StatusBadgeProps {
  tone: Tone
  label: StatusLabel
  /** Animated dot for states that are still moving (PROCESSING, RETRYING, DELIVERING). */
  live?: boolean
  className?: string
}

export function StatusBadge({ tone, label, live, className }: StatusBadgeProps) {
  const { t } = useTranslation('status')
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1.5 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap',
        toneClass[tone],
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {live && <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative size-1.5 rounded-full bg-current" />
      </span>
      {t(label)}
    </span>
  )
}

/** Each domain maps its own statuses to a tone + label key in one place. */
export type StatusMap<S extends string> = Record<S, { tone: Tone; label: StatusLabel; live?: boolean }>
