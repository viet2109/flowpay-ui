import { useTranslation } from 'react-i18next'
import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/cn'

export function CodeBlock({ code, label, className }: { code: string; label?: string; className?: string }) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  return (
    <div className={cn('overflow-hidden rounded-md border border-line bg-surface-sunken', className)}>
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <span className="font-mono text-2xs text-ink-3 uppercase">{label}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink"
          onClick={async () => {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1200)
          }}
        >
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-ink-2">
        <code>{code}</code>
      </pre>
    </div>
  )
}
