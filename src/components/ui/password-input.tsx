import { EyeIcon, EyeSlashIcon, WarningIcon } from '@phosphor-icons/react'
import { useState, type ComponentProps, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './button'
import { Input } from './input'

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'trailing'>

/**
 * Password field with a show/hide toggle and a Caps Lock warning. Accepts the
 * props of Input (including react-hook-form's register()); `Field` labels it.
 */
export function PasswordInput({ onKeyDown, onKeyUp, onBlur, ...props }: PasswordInputProps) {
  const { t } = useTranslation('common')
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const readCapsLock = (event: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState?.('CapsLock') ?? false)

  return (
    <div className="space-y-1.5">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        onKeyDown={(event) => {
          readCapsLock(event)
          onKeyDown?.(event)
        }}
        onKeyUp={(event) => {
          readCapsLock(event)
          onKeyUp?.(event)
        }}
        onBlur={(event) => {
          setCapsLock(false)
          onBlur?.(event)
        }}
        trailing={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={visible ? t('password.hide') : t('password.show')}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeSlashIcon /> : <EyeIcon />}
          </Button>
        }
      />
      {capsLock && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-warning">
          <WarningIcon className="size-3.5" />
          {t('password.capsLock')}
        </p>
      )}
    </div>
  )
}
