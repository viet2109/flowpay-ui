import { cn } from '@/lib/cn'
import { splitUrl } from '../catalog'

/**
 * Host is what people recognise; scheme and path are secondary. `muted` (a
 * disabled endpoint) lowers the host to secondary text without losing contrast.
 */
export function EndpointUrl({ url, muted, className }: { url: string; muted?: boolean; className?: string }) {
  const { scheme, host, path } = splitUrl(url)
  return (
    <span className={cn('min-w-0 truncate font-mono text-sm', className)} title={url}>
      <span className="text-ink-3">{scheme}</span>
      <span className={muted ? 'text-ink-2' : 'text-ink'}>{host}</span>
      <span className={muted ? 'text-ink-3' : 'text-ink-2'}>{path}</span>
    </span>
  )
}
