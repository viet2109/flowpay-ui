import { Label as LabelPrimitive } from 'radix-ui'
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface FieldProps {
  label: ReactNode
  /** Shown under the control until there is an error. */
  hint?: ReactNode
  error?: string
  /** Right side of the label row, e.g. a "Forgot?" link or character count. */
  aside?: ReactNode
  className?: string
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, hint, error, aside, className, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': hint || error ? messageId : undefined,
      })
    : children

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <LabelPrimitive.Root htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </LabelPrimitive.Root>
        {aside}
      </div>
      {control}
      {(error || hint) && (
        <p id={messageId} className={cn('text-xs', error ? 'text-danger' : 'text-ink-3')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
