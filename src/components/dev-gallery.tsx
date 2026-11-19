import type { ReactNode } from 'react'
import { StatusBadge, type StatusMap } from '@/components/status-badge'
import { Panel, PanelHeader } from '@/components/ui/panel'

/**
 * Building blocks of the dev-only /dev/ui gallery, shared by the app page and
 * by the sections features contribute. Not for product screens.
 */
export function GallerySection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Panel aria-label={title}>
      <PanelHeader title={title} description={description} />
      <div className="p-4">{children}</div>
    </Panel>
  )
}

/** One labelled cell: the state name above the element in that state. */
export function GalleryState({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <span className="text-xs text-ink-3">{label}</span>
      {children}
    </div>
  )
}

/** Every status of one domain's StatusMap, with the backend enum under each badge. */
export function GalleryStatusRow<S extends string>({ name, map }: { name: string; map: StatusMap<S> }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-36 shrink-0 font-mono text-xs text-ink-2">{name}</span>
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        {(Object.keys(map) as S[]).map((status) => (
          <div key={status} className="flex flex-col items-start gap-1">
            <StatusBadge {...map[status]} />
            <span className="font-mono text-2xs text-ink-3">{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
