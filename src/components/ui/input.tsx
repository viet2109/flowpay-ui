import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * States, in priority order: invalid (danger border, kept on hover and focus),
 * focus (accent border + ring), hover (darker border), disabled (sunken, muted).
 */
const fieldBase = [
  'w-full rounded-md border border-line-control bg-surface px-2.5 text-sm text-ink placeholder:text-ink-3',
  'transition-[border-color,box-shadow] duration-150',
  'hover:border-ink-2 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/15',
  'aria-invalid:border-danger aria-invalid:hover:border-danger aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger/15',
  'disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-surface-sunken disabled:text-ink-3',
].join(' ')

interface InputProps extends ComponentProps<'input'> {
  /** Static text/icon rendered inside the left edge, e.g. a currency code. */
  leading?: ReactNode
  trailing?: ReactNode
}

export function Input({ className, leading, trailing, ...props }: InputProps) {
  if (!leading && !trailing) return <input className={cn(fieldBase, 'h-8', className)} {...props} />
  return (
    <div className="relative flex items-center">
      {leading && (
        <span className="pointer-events-none absolute left-2.5 flex items-center text-sm text-ink-3">
          {leading}
        </span>
      )}
      <input className={cn(fieldBase, 'h-8', leading && 'pl-11', trailing && 'pr-9', className)} {...props} />
      {trailing && <span className="absolute right-1.5 flex items-center">{trailing}</span>}
    </div>
  )
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, 'min-h-18 resize-y py-1.5', className)} {...props} />
}

export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select className={cn(fieldBase, 'h-8 appearance-none pr-8', className)} {...props}>
        {children}
      </select>
      <svg
        viewBox="0 0 16 16"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-3"
        aria-hidden="true"
      >
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}
