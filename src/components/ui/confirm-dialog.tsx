import { useTranslation } from 'react-i18next'
import { AlertDialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  loading?: boolean
  tone?: 'danger' | 'default'
  /** Shown between the description and the buttons, e.g. the consequence in numbers or a failure. */
  children?: ReactNode
}

/**
 * For irreversible actions (revoke key, disable endpoint). The dialog stays open
 * while `loading`, so the person sees the outcome of what they confirmed.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
  tone = 'danger',
  children,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common')
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fp-fade fixed inset-0 z-50 bg-ink/30" />
        <AlertDialog.Content className="fp-pop fixed top-[20vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-lg border border-line bg-surface p-5 shadow-pop">
          <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-sm text-ink-2">
            {description}
          </AlertDialog.Description>
          {children && <div className="mt-4 space-y-3">{children}</div>}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" disabled={loading}>
                {t('cancel')}
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant={tone === 'danger' ? 'danger' : 'primary'}
              loading={loading}
              onClick={(event) => {
                event.preventDefault()
                onConfirm()
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
