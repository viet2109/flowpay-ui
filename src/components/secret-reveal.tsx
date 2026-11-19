import { useTranslation } from 'react-i18next'
import { CheckIcon, CopyIcon, EyeIcon, EyeSlashIcon, LockKeyIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from './ui/button'

interface SecretRevealProps {
  label: string
  secret: string
}

/**
 * One-time secret display (API key, webhook signing secret). The backend never
 * returns these again (BR-KEY-002), so the copy affordance is the main action.
 */
export function SecretReveal({ label, secret }: SecretRevealProps) {
  const { t } = useTranslation('common')
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-1 rounded-md border border-line-strong bg-surface-sunken p-1 pl-3">
        <code className="min-w-0 flex-1 truncate font-mono text-sm">
          {visible ? secret : `${secret.slice(0, 12)}${'•'.repeat(Math.max(8, secret.length - 12))}`}
        </code>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('hide') : t('show')}
        >
          {visible ? <EyeSlashIcon /> : <EyeIcon />}
        </Button>
        <Button size="sm" variant={copied ? 'secondary' : 'primary'} onClick={copy}>
          {copied ? <CheckIcon weight="bold" /> : <CopyIcon />}
          {copied ? t('copied') : t('copy')}
        </Button>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-ink-2">
        <LockKeyIcon className="mt-px size-3.5 shrink-0 text-warning" />
        {t('secretOnce')}
      </p>
    </div>
  )
}
