import { ArrowCounterClockwiseIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { CopyableId } from '@/components/copyable-id'
import { Money } from '@/components/money'
import { Pagination } from '@/components/pagination'
import { RelativeTime } from '@/components/relative-time'
import { EmptyState, ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { isApiError } from '@/lib/api/errors'
import { usePaymentRefunds, useRefund } from '../queries'
import { useReasonLabel } from '../refund-reasons'
import { refundStatus } from '../status'
import type { Refund } from '../types'
import { RefundDetails } from './RefundDetails'

/**
 * A payment's refunds. A refund opens in a sheet addressed by the URL
 * (?refund=re_…): opening adds a history entry so Back closes it; closing
 * replaces it, so a shared link closes without leaving the payment.
 */
export function RefundsPanel({ paymentId }: { paymentId: string }) {
  const { t } = useTranslation('payments')
  const [page, setPage] = useState(0)
  const reasonLabel = useReasonLabel()
  const [params, setParams] = useSearchParams()
  const openRefund = params.get('refund')
  const { data, isPending, isFetching, error, refetch } = usePaymentRefunds(paymentId, page)

  function setOpen(id: string | null) {
    const next = new URLSearchParams(params)
    if (id) next.set('refund', id)
    else next.delete('refund')
    setParams(next, { replace: !id })
  }

  const sheet = (
    <RefundSheet
      refundId={openRefund}
      // Row data shows at once; the refund's own request refreshes it.
      fromList={data?.items.find((r) => r.id === openRefund)}
      onClose={() => setOpen(null)}
    />
  )

  if (isPending) return <TableSkeleton rows={2} columns={4} />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (data.items.length === 0) {
    return (
      <>
        <EmptyState icon={<ArrowCounterClockwiseIcon />} title={t('refunds.emptyTitle')} className="py-8">
          {t('refunds.emptyBody')}
        </EmptyState>
        {sheet}
      </>
    )
  }

  return (
    <>
      <Table>
        <THead>
          <tr>
            <Th className="text-right">{t('refunds.columns.amount')}</Th>
            <Th>{t('refunds.columns.status')}</Th>
            <Th>{t('refunds.columns.reason')}</Th>
            <Th className="hidden sm:table-cell">{t('refunds.columns.id')}</Th>
            <Th className="text-right">{t('refunds.columns.created')}</Th>
          </tr>
        </THead>
        <TBody>
          {data.items.map((refund) => (
            <Tr
              key={refund.id}
              interactive
              tabIndex={0}
              onClick={() => setOpen(refund.id)}
              onKeyDown={(e) => e.key === 'Enter' && setOpen(refund.id)}
            >
              <Td className="w-0 text-right">
                <Money amount={refund.amount} currency={refund.currency} size="sm" negative />
              </Td>
              <Td className="w-0">
                <StatusBadge {...refundStatus[refund.status]} />
              </Td>
              <Td className="max-w-44 truncate text-ink-2">{reasonLabel(refund.reason) ?? '—'}</Td>
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
      {sheet}
    </>
  )
}

function RefundSheet({
  refundId,
  fromList,
  onClose,
}: {
  refundId: string | null
  fromList?: Refund
  onClose: () => void
}) {
  const { t } = useTranslation('payments')
  const { data, isFetching, error, refetch } = useRefund(refundId)
  const refund = data ?? fromList

  return (
    <Sheet
      open={Boolean(refundId)}
      onOpenChange={(open) => !open && onClose()}
      eyebrow={t('refundDetail.eyebrow')}
      title={refund ? <span className="font-mono text-sm">{refund.id}</span> : t('refundDetail.loading')}
      actions={
        refundId && (
          <Button size="sm" asChild>
            <Link to={`/refunds/${refundId}`}>
              <ArrowSquareOutIcon />
              {t('refundDetail.openPage')}
            </Link>
          </Button>
        )
      }
    >
      <div className="p-5">
        {refund ? (
          <RefundDetails refund={refund} onCheckAgain={() => void refetch()} checking={isFetching} />
        ) : error ? (
          // Asking again for a refund that does not exist cannot help.
          <ErrorState error={error} onRetry={isApiError(error, 'REFUND_NOT_FOUND') ? undefined : refetch} />
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </div>
    </Sheet>
  )
}
