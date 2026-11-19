import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4', className)} aria-hidden="true" />
}

/** Placeholder rows shaped like the real table, so the layout doesn't jump on load. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  const { t } = useTranslation('common')
  return (
    <div role="status" aria-label={t('loading')} className="divide-y divide-line">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-11 items-center gap-6 px-4">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={c}
              className={cn('h-3', c === 0 ? 'w-24' : c === columns - 1 ? 'ml-auto w-16' : 'w-20')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
