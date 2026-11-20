import { ToggleGroup } from 'radix-ui'
import { cn } from '@/lib/cn'

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; count?: number }[]
  'aria-label': string
  className?: string
}

/** Single-choice filter row. Clicking the active option does nothing (never empty). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ...rest
}: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
      aria-label={rest['aria-label']}
      className={cn('inline-flex rounded-md border border-line bg-surface-sunken p-0.5', className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'flex h-6.5 items-center gap-1.5 rounded-sm px-2.5 text-sm whitespace-nowrap text-ink-2 transition-colors',
            'hover:text-ink data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:ring-1 data-[state=on]:ring-line',
          )}
        >
          {option.label}
          {option.count !== undefined && <span className="num text-xs text-ink-3">{option.count}</span>}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
