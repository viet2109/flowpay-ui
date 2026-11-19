import { useTranslation } from 'react-i18next'
import { XIcon } from '@phosphor-icons/react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  /** Small line above the title, e.g. the resource type. */
  eyebrow?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Right-side drawer for inspecting a record without leaving the list. */
export function Sheet({ open, onOpenChange, title, eyebrow, actions, children, className }: SheetProps) {
  const { t } = useTranslation('common')
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fp-fade fixed inset-0 z-50 bg-ink/20" />
        <DialogPrimitive.Content
          className={cn(
            'fp-slide-in fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-line bg-surface shadow-pop focus:outline-none',
            className,
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0 space-y-0.5">
              {eyebrow && <div className="text-xs text-ink-3">{eyebrow}</div>}
              <DialogPrimitive.Title className="truncate text-base font-semibold">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">{t('details')}</DialogPrimitive.Description>
            </div>
            <div className="flex items-center gap-1">
              {actions}
              <DialogPrimitive.Close className="rounded-md p-1.5 text-ink-3 hover:bg-surface-hover hover:text-ink">
                <XIcon className="size-4" />
                <span className="sr-only">{t('close')}</span>
              </DialogPrimitive.Close>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
