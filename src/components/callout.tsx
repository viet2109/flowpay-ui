import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type CalloutTone = 'info' | 'success' | 'warning' | 'danger'

const styles: Record<CalloutTone, { box: string; Icon: typeof InfoIcon }> = {
  info: { box: 'bg-surface-sunken text-ink-2', Icon: InfoIcon },
  success: { box: 'bg-success-soft text-success', Icon: CheckCircleIcon },
  warning: { box: 'bg-warning-soft text-warning', Icon: WarningIcon },
  danger: { box: 'bg-danger-soft text-danger', Icon: WarningCircleIcon },
}

interface CalloutProps {
  tone: CalloutTone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}

/** Inline message inside a page or form. For transient feedback use a toast instead. */
export function Callout({ tone, title, children, action, className }: CalloutProps) {
  const { box, Icon } = styles[tone]
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-md px-3 py-2.5 text-sm', box, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-medium">{title}</div>}
        {children && <div className={cn(title && 'mt-0.5 opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
