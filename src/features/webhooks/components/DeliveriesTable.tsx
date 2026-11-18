import { CopyableId } from '@/components/copyable-id'
import { RelativeTime } from '@/components/relative-time'
import { StatusBadge } from '@/components/status-badge'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { deliveryStatus, MAX_AUTOMATIC_ATTEMPTS } from '../catalog'
import type { WebhookDelivery } from '../types'

export function HttpResult({ status, error }: { status: number | null; error?: string | null }) {
  if (status !== null) {
    const ok = status >= 200 && status < 300
    return (
      <span className={cn('num font-mono text-xs', ok ? 'text-success' : 'text-danger')}>HTTP {status}</span>
    )
  }
  if (error)
    return (
      <span className="block max-w-56 truncate text-xs text-danger" title={error}>
        {error}
      </span>
    )
  return <span className="text-ink-3">—</span>
}

export function DeliveriesTable({
  deliveries,
  onSelect,
}: {
  deliveries: WebhookDelivery[]
  onSelect: (delivery: WebhookDelivery) => void
}) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>Event</Th>
          <Th>Status</Th>
          <Th className="hidden md:table-cell">Resource</Th>
          <Th className="text-right">Attempts</Th>
          <Th>Last result</Th>
          <Th className="hidden lg:table-cell">Next / delivered</Th>
          <Th className="text-right">Created</Th>
        </tr>
      </THead>
      <TBody>
        {deliveries.map((d) => (
          <Tr
            key={d.id}
            interactive
            tabIndex={0}
            onClick={() => onSelect(d)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(d)}
          >
            <Td className="font-mono text-xs">{d.eventType}</Td>
            <Td>
              <StatusBadge {...deliveryStatus[d.status]} />
            </Td>
            <Td className="hidden md:table-cell">
              <CopyableId value={d.resourceId} />
            </Td>
            <Td className="num text-right text-ink-2">
              {d.attemptCount}
              <span className="text-ink-3">/{Math.max(MAX_AUTOMATIC_ATTEMPTS, d.attemptCount)}</span>
            </Td>
            <Td>
              <HttpResult status={d.lastHttpStatus} error={d.lastError} />
            </Td>
            <Td className="hidden text-ink-3 lg:table-cell">
              {d.deliveredAt ? (
                <RelativeTime value={d.deliveredAt} />
              ) : d.nextAttemptAt ? (
                <span>
                  retry <RelativeTime value={d.nextAttemptAt} />
                </span>
              ) : (
                '—'
              )}
            </Td>
            <Td className="text-right text-ink-3">
              <RelativeTime value={d.createdAt} />
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  )
}
