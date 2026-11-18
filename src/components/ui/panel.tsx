import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Bordered surface. Structure comes from hairlines, not drop shadows. */
export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('rounded-lg border border-line bg-surface', className)} {...props} />
}

interface PanelHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PanelHeader({ title, description, actions, className }: PanelHeaderProps) {
  return (
    <header
      className={cn('flex items-start justify-between gap-4 border-b border-line px-4 py-3', className)}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
