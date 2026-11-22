import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Skeleton } from '@/components/ui/skeleton'
import { isApiError } from '@/lib/api/errors'
import { RefundDetails } from '../components/RefundDetails'
import { useRefund } from '../queries'
import { refundStatus } from '../status'

/** /refunds/:refundId (GET /merchant/refunds/{id}, contract §18). */
export function RefundDetailPage() {
  const { t } = useTranslation('payments')
  const { refundId = '' } = useParams()
  const { data: refund, isPending, isFetching, error, refetch } = useRefund(refundId)

  if (isPending) {
    return (
      <div className="space-y-5" role="status" aria-label={t('refundDetail.loading')}>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 max-w-2xl rounded-lg" />
      </div>
    )
  }
  if (error) {
    return (
      <>
        <PageHeader
          title={t('refundDetail.title')}
          back={{ to: '/payments', label: t('refundDetail.backToPayments') }}
        />
        <Panel>
          {/* Asking again for a refund that does not exist cannot help. */}
          <ErrorState error={error} onRetry={isApiError(error, 'REFUND_NOT_FOUND') ? undefined : refetch} />
        </Panel>
      </>
    )
  }

  return (
    <>
      <PageHeader
        back={{ to: `/payments/${refund.paymentId}`, label: t('refundDetail.back') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Money amount={refund.amount} currency={refund.currency} size="xl" negative />
            <StatusBadge {...refundStatus[refund.status]} className="h-6 px-2 text-sm" />
          </span>
        }
      />
      <Panel className="max-w-2xl">
        <PanelHeader title={t('refundDetail.details')} />
        <div className="p-4">
          <RefundDetails
            refund={refund}
            showAmount={false}
            onCheckAgain={() => void refetch()}
            checking={isFetching}
          />
        </div>
      </Panel>
    </>
  )
}
