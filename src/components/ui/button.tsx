import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './spinner'

const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,transform] duration-150 ease-out-quint',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // Primary is ink, not a brand colour: the money is the hero, not the button.
        primary: 'bg-ink text-ink-inverse hover:bg-ink/88',
        secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-hover',
        ghost: 'text-ink-2 hover:bg-surface-hover hover:text-ink',
        danger: 'bg-danger text-ink-inverse hover:bg-danger/90',
        'danger-outline':
          'border border-line-strong bg-surface text-danger hover:border-danger/50 hover:bg-danger-soft',
        link: 'h-auto px-0 text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-7 px-2.5 text-sm',
        md: 'h-8 px-3 text-sm',
        lg: 'h-10 px-4 text-base',
        icon: 'size-8',
        'icon-sm': 'size-7',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export function Button({
  className,
  variant,
  size,
  asChild,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner className="absolute" />}
          {/* opacity, not visibility: the label stays the button's accessible name while loading. */}
          <span className={cn('inline-flex items-center gap-1.5', loading && 'opacity-0')}>{children}</span>
        </>
      )}
    </Comp>
  )
}
