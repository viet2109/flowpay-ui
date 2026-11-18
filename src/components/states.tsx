import { WarningIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { errorMessage, isApiError } from '@/lib/api/errors'
import { cn } from '@/lib/cn'
import { CopyableId } from './copyable-id'
import { Button } from './ui/button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}

/** Explains why a list is empty and what to do next. No illustrations. */
export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-3 flex size-9 items-center justify-center rounded-md border border-line bg-surface-sunken text-ink-3 [&_svg]:size-4.5">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Failed query. Shows the requestId so a merchant can quote it to support. */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown
  onRetry?: () => void
  className?: string
}) {
  const requestId = isApiError(error) ? error.requestId : undefined
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <WarningIcon className="mb-2 size-5 text-danger" />
      <p className="text-sm font-medium">Could not load this</p>
      <p className="mt-1 max-w-sm text-sm text-ink-2">{errorMessage(error)}</p>
      {requestId && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
          Request <CopyableId value={requestId} truncate={false} />
        </p>
      )}
      {onRetry && (
        <Button size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
