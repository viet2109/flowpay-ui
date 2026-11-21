import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { CopyableId } from '@/components/copyable-id'
import { DescriptionList } from '@/components/description-list'
import { Money } from '@/components/money'
import { RelativeTime } from '@/components/relative-time'
import { EmptyState, ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Pagination } from '@/components/pagination'
import { Sheet } from '@/components/ui/sheet'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { humanize } from '@/lib/format'
import { useFormat } from '@/i18n'
import { usePaymentRefunds, useRefund } from '../queries'
import { refundStatus } from '../status'
import type { Refund } from '../types'

export function RefundsPanel({ paymentId }: { paymentId: string }) {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Refund | null>(null)
  const { data, isPending, isFetching, error, refetch } = usePaymentRefunds(paymentId, page)

  if (isPending) return <TableSkeleton rows={2} columns={4} />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (data.items.length === 0) {
    return (
      <EmptyState icon={<ArrowCounterClockwiseIcon />} title="No refunds" className="py-8">
        Partial and full refunds for this payment will be listed here.
      </EmptyState>
    )
  }

  return (
    <>
      <Table>
        <THead>
          <tr>
            <Th className="text-right">Amount</Th>
            <Th>Status</Th>
            <Th>Reason</Th>
            <Th className="hidden sm:table-cell">Refund ID</Th>
            <Th className="text-right">Created</Th>
          </tr>
        </THead>
        <TBody>
          {data.items.map((refund) => (
            <Tr
              key={refund.id}
              interactive
              tabIndex={0}
              onClick={() => setSelected(refund)}
              onKeyDown={(e) => e.key === 'Enter' && setSelected(refund)}
            >
              <Td className="w-0 text-right">
                <Money amount={refund.amount} currency={refund.currency} size="sm" negative />
              </Td>
              <Td className="w-0">
                <StatusBadge {...refundStatus[refund.status]} />
              </Td>
              <Td className="max-w-44 truncate text-ink-2">
                {refund.reason ? humanize(refund.reason) : '—'}
              </Td>
              <Td className="hidden sm:table-cell">
                <CopyableId value={refund.id} />
              </Td>
              <Td className="text-right text-ink-3">
                <RelativeTime value={refund.createdAt} />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <Pagination meta={data.meta} onPageChange={setPage} pending={isFetching} />
      <RefundSheet refund={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function RefundSheet({ refund, onClose }: { refund: Refund | null; onClose: () => void }) {
  const fmt = useFormat()
  // Row data renders instantly; the detail request refreshes it in the background.
  const { data } = useRefund(refund?.id ?? null)
  const current = data ?? refund

  return (
    <Sheet
      open={Boolean(refund)}
      onOpenChange={(open) => !open && onClose()}
      eyebrow="Refund"
      title={current ? current.id : ''}
    >
      {current && (
        <div className="space-y-6 p-5">
          <div className="space-y-2">
            <Money amount={current.amount} currency={current.currency} size="xl" negative />
            <StatusBadge {...refundStatus[current.status]} />
          </div>
          <DescriptionList
            items={[
              { label: 'Refund ID', value: <CopyableId value={current.id} truncate={false} /> },
              { label: 'Payment', value: <CopyableId value={current.paymentId} truncate={false} /> },
              { label: 'Reason', value: current.reason ? humanize(current.reason) : null },
              { label: 'Provider', value: current.provider },
              {
                label: 'Provider ref.',
                value: current.providerRefundId && (
                  <span className="font-mono text-xs">{current.providerRefundId}</span>
                ),
              },
              {
                label: 'Failure',
                hidden: !current.failureCode,
                value: (
                  <span>
                    <span className="font-mono text-xs text-danger">{current.failureCode}</span>
                    {current.failureMessage && (
                      <span className="block text-ink-2">{current.failureMessage}</span>
                    )}
                  </span>
                ),
              },
              { label: 'Created', value: fmt.dateTime(current.createdAt) },
              { label: 'Completed', value: fmt.dateTime(current.completedAt) },
            ]}
          />
        </div>
      )}
    </Sheet>
  )
}
