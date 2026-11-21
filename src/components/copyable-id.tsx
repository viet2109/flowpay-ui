import { useTranslation } from 'react-i18next'
import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import { useState, type MouseEvent } from 'react'
import { cn } from '@/lib/cn'

/**
 * Public FlowPay IDs (pi_01K..., re_..., wep_...). The type prefix is dimmed so
 * people scan by prefix first, then by the unique tail. Click copies.
 */
export function CopyableId({
  value,
  className,
  truncate = true,
}: {
  value: string
  className?: string
  truncate?: boolean
}) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  const split = value.indexOf('_')
  const prefix = split > 0 ? value.slice(0, split + 1) : ''
  const rest = split > 0 ? value.slice(split + 1) : value
  const shown = truncate && rest.length > 14 ? `${rest.slice(0, 6)}…${rest.slice(-6)}` : rest

  async function copy(event: MouseEvent) {
    event.stopPropagation() // rows are often clickable
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={value}
      className={cn(
        'group inline-flex max-w-full items-center gap-1 rounded-sm font-mono text-xs text-ink-2 hover:text-ink',
        className,
      )}
    >
      {/* A full ID wraps on a narrow screen rather than widening the page. */}
      <span className={truncate ? undefined : 'min-w-0 text-left break-all'}>
        <span className="text-ink-3">{prefix}</span>
        {shown}
      </span>
      <span className="sr-only">{t('copyValue', { value })}</span>
      {copied ? (
        <CheckIcon weight="bold" className="size-3 text-success" />
      ) : (
        <CopyIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      )}
    </button>
  )
}
