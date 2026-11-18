import { ArrowLeftIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  /** Content between title row and page body, e.g. filters. */
  children?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, back, children, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-5 space-y-4', className)}>
      {back && (
        <Link to={back.to} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
          <ArrowLeftIcon className="size-3.5" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
