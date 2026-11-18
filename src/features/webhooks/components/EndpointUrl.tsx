import { cn } from '@/lib/cn'
import { splitUrl } from '../catalog'

/** Host is what people recognise; scheme and path are secondary. */
export function EndpointUrl({ url, className }: { url: string; className?: string }) {
  const { scheme, host, path } = splitUrl(url)
  return (
    <span className={cn('min-w-0 truncate font-mono text-sm', className)} title={url}>
      <span className="text-ink-3">{scheme}</span>
      <span className="text-ink">{host}</span>
      <span className="text-ink-2">{path}</span>
    </span>
  )
}
