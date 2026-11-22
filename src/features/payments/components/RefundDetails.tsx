import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Callout } from '@/components/callout'
import { CopyableId } from '@/components/copyable-id'
import { DescriptionList } from '@/components/description-list'
import { Money } from '@/components/money'
import { StatusBadge } from '@/components/status-badge'
import { useFormat } from '@/i18n'
import { useReasonLabel } from '../refund-reasons'
import { refundStatus } from '../status'
import type { Refund } from '../types'

/** One refund's facts, shared by its page and the sheet on the payment page. */
export function RefundDetails({ refund, showAmount = true }: { refund: Refund; showAmount?: boolean }) {
  const { t } = useTranslation('payments')
  const fmt = useFormat()
  const reasonLabel = useReasonLabel()

  return (
    <div className="space-y-5">
      {showAmount && (
        <div className="flex flex-wrap items-center gap-3">
          <Money amount={refund.amount} currency={refund.currency} size="xl" negative />
          <StatusBadge {...refundStatus[refund.status]} />
        </div>
      )}

      {refund.status === 'FAILED' && (
        // A decline and a technical failure both end FAILED: the code says which.
        <Callout tone="danger" title={t('refundDetail.failedTitle')}>
          {refund.failureCode && <span className="font-mono text-xs">{refund.failureCode}</span>}
          {refund.failureMessage && ` · ${refund.failureMessage}`}
        </Callout>
      )}
      {refund.status === 'PROCESSING' && (
        <Callout tone="warning" title={t('refundDetail.processingTitle')}>
          {t('refundDetail.processingBody')}
        </Callout>
      )}

      <DescriptionList
        items={[
          { label: t('refundDetail.refundId'), value: <CopyableId value={refund.id} truncate={false} /> },
          {
            label: t('refundDetail.payment'),
            value: (
              <Link
                to={`/payments/${refund.paymentId}`}
                className="font-mono text-xs break-all text-accent hover:underline"
              >
                {refund.paymentId}
              </Link>
            ),
          },
          { label: t('refundDetail.reason'), value: reasonLabel(refund.reason) },
          { label: t('refundDetail.provider'), value: refund.provider },
          {
            label: t('refundDetail.providerRef'),
            value: refund.providerRefundId && (
              <span className="font-mono text-xs break-all">{refund.providerRefundId}</span>
            ),
          },
          { label: t('refundDetail.created'), value: fmt.dateTime(refund.createdAt) },
          {
            label: t('refundDetail.completed'),
            value: refund.completedAt && fmt.dateTime(refund.completedAt),
          },
        ]}
      />
    </div>
  )
}
