import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface DescriptionItem {
  label: string
  value: ReactNode
  hidden?: boolean
}

/** Label/value grid for record details. Labels align, values wrap. */
export function DescriptionList({ items, className }: { items: DescriptionItem[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-6 text-sm', className)}>
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <div
            key={item.label}
            className="col-span-2 grid grid-cols-subgrid border-b border-line py-2.5 last:border-b-0"
          >
            <dt className="text-ink-3">{item.label}</dt>
            <dd className="min-w-0 break-words text-ink">
              {item.value ?? <span className="text-ink-3">—</span>}
            </dd>
          </div>
        ))}
    </dl>
  )
}
