import { useEffect, useState } from 'react'
import { formatDateTime, formatRelative } from '@/lib/format'
import { Tooltip } from './ui/tooltip'

/** "3 min ago" with the exact timestamp on hover. Re-renders every 30s. */
export function RelativeTime({ value, className }: { value: string | null | undefined; className?: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  if (!value) return <span className="text-ink-3">—</span>
  return (
    <Tooltip content={formatDateTime(value)}>
      <time dateTime={value} className={className}>
        {formatRelative(value, now)}
      </time>
    </Tooltip>
  )
}
