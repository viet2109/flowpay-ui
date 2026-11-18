import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}

export function THead(props: ComponentProps<'thead'>) {
  return <thead {...props} />
}

export function TBody(props: ComponentProps<'tbody'>) {
  return <tbody {...props} />
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-8 border-b border-line px-4 text-left align-middle text-xs font-medium whitespace-nowrap text-ink-3',
        className,
      )}
      {...props}
    />
  )
}

interface TrProps extends ComponentProps<'tr'> {
  /** Makes the row look and behave clickable (pair with onClick + keyboard handler). */
  interactive?: boolean
}

export function Tr({ className, interactive, ...props }: TrProps) {
  return (
    <tr
      className={cn(
        'border-b border-line last:border-b-0',
        interactive &&
          'cursor-pointer transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('h-11 px-4 align-middle whitespace-nowrap', className)} {...props} />
}
