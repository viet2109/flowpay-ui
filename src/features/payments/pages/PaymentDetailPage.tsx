import { ArrowCounterClockwiseIcon, LightningIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Callout } from '@/components/callout'
import { CodeBlock } from '@/components/code-block'
import { CopyableId } from '@/components/copyable-id'
import { DescriptionList } from '@/components/description-list'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/states'
import { useCanRunPayments } from '@/features/auth'
import { isApiError } from '@/lib/api/errors'
import { useIdempotencyKey } from '@/lib/idempotency'
import { useErrorMessage, useFormat } from '@/i18n'
import { useRecentItems } from '@/lib/recent-items'
import { AttemptsList } from '../components/AttemptsList'
import { LifecycleRail } from '../components/LifecycleRail'
import { RefundCapacity } from '../components/RefundCapacity'
import { RefundDialog } from '../components/RefundDialog'
import { RefundsPanel } from '../components/RefundsPanel'
import { lifecycleTimes } from '../lifecycle'
import { useConfirmPayment, usePayment, usePaymentRefunds, usePaymentTransactions } from '../queries'
import { canConfirm, canRefund, paymentStatus } from '../status'
import { useOutcomeToast } from '../use-outcome-toast'

export function PaymentDetailPage() {
  const { paymentId = '' } = useParams()
  return (
    // key: switching payments (e.g. via ⌘K) starts from a clean slate
    <PaymentDetail key={paymentId} id={paymentId} />
  )
}

function PaymentDetail({ id }: { id: string }) {
  const { t } = useTranslation('payments')
  const errorMessage = useErrorMessage()
  const fmt = useFormat()
  const { data: payment, isPending, isFetching, error, refetch, pollingStopped } = usePayment(id)
  // Offered again in the command menu's "Recent".
  const remember = useRecentItems((s) => s.remember)
  useEffect(() => {
    if (payment)
      remember({
        kind: 'payment',
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
      })
  }, [payment, remember])
  const { data: attempts } = usePaymentTransactions(id, payment?.updatedAt)
  // Page 0 is what the refunds panel shows too (same query), so this costs nothing extra.
  const { data: refunds } = usePaymentRefunds(id, 0)
  const [refunding, setRefunding] = useState(false)
  const confirm = useConfirmPayment()
  const outcome = useOutcomeToast()
  const confirmKey = useIdempotencyKey('confirm')
  const canRun = useCanRunPayments()

  if (isPending) return <DetailSkeleton />
  if (error) {
    return (
      <>
        <PageHeader title={t('detail.title')} back={{ to: '/payments', label: t('detail.back') }} />
        <Panel>
          {/* Asking again for a payment that does not exist cannot help. */}
          <ErrorState error={error} onRetry={isApiError(error, 'PAYMENT_NOT_FOUND') ? undefined : refetch} />
        </Panel>
      </>
    )
  }

  const latest = attempts?.at(-1)
  const unknownOutcome = payment.status === 'PROCESSING' && latest?.status === 'UNKNOWN'

  /** The key belongs to confirming this payment: a retry after a failure reuses it. */
  function runConfirm() {
    confirm.mutate(
      { paymentId: id, idempotencyKey: confirmKey.keyFor(id) },
      {
        onSuccess: (result) => outcome.confirmed(result, payment!),
        onError: (e) => toast.error(errorMessage(e)),
      },
    )
  }

  return (
    <>
      <PageHeader
        back={{ to: '/payments', label: t('detail.back') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Money amount={payment.amount} currency={payment.currency} size="xl" />
            <StatusBadge {...paymentStatus[payment.status]} className="h-6 px-2 text-sm" />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <CopyableId value={payment.id} truncate={false} />
            {payment.orderId && <span>{t('detail.order', { id: payment.orderId })}</span>}
          </span>
        }
        actions={
          <>
            {canRun && canConfirm(payment.status) && (
              <Button variant="primary" onClick={runConfirm} loading={confirm.isPending}>
                <LightningIcon weight="fill" />
                {t('detail.confirm')}
              </Button>
            )}
            {canRun && canRefund(payment.status, payment.refundableAmount) && (
              <Button onClick={() => setRefunding(true)}>
                <ArrowCounterClockwiseIcon />
                {t('detail.refund')}
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-5">
        <Panel className="px-5 pt-5 pb-4">
          <LifecycleRail
            status={payment.status}
            times={lifecycleTimes(
              payment,
              attempts,
              refunds && { items: refunds.items, complete: !refunds.meta.hasNext },
            )}
          />
          {unknownOutcome ? (
            <Callout
              tone="warning"
              className="mt-5"
              title={t('detail.unknownTitle')}
              action={<RefreshButton onClick={() => void refetch()} loading={isFetching} />}
            >
              {t('detail.unknownBody', { code: latest.failureCode ?? 'UNKNOWN' })}
            </Callout>
          ) : (
            // Processing without an unknown outcome usually settles in seconds; past the
            // polling budget, say that checking stopped instead of looking live.
            pollingStopped && (
              <Callout
                tone="info"
                className="mt-5"
                action={<RefreshButton onClick={() => void refetch()} loading={isFetching} />}
              >
                {t('detail.pollingStopped')}
              </Callout>
            )
          )}
          {/* A decline and a technical failure both end FAILED: the code says which. */}
          {payment.status === 'FAILED' && latest?.failureCode && (
            <Callout tone="danger" className="mt-5" title={t('detail.failedTitle')}>
              <span className="font-mono text-xs">{latest.failureCode}</span>
              {latest.failureMessage && ` · ${latest.failureMessage}`}
            </Callout>
          )}
        </Panel>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-5">
            <Panel>
              <PanelHeader title={t('detail.capacityTitle')} description={t('detail.capacityHint')} />
              <div className="p-4">
                <RefundCapacity payment={payment} />
              </div>
            </Panel>
            <Panel>
              <PanelHeader title={t('detail.refunds')} />
              <RefundsPanel paymentId={payment.id} />
            </Panel>
            <Panel>
              <PanelHeader title={t('detail.attempts')} description={t('detail.attemptsHint')} />
              <AttemptsList paymentId={payment.id} version={payment.updatedAt} />
            </Panel>
          </div>

          <aside className="min-w-0 space-y-5">
            <Panel>
              <PanelHeader title={t('detail.details')} />
              <DescriptionList
                className="px-4 py-1"
                items={[
                  {
                    label: t('detail.amount'),
                    value: <Money amount={payment.amount} currency={payment.currency} size="sm" />,
                  },
                  {
                    label: t('detail.minorUnits'),
                    value: <span className="num font-mono text-xs">{payment.amount}</span>,
                  },
                  { label: t('detail.orderId'), value: payment.orderId },
                  { label: t('detail.description'), value: payment.description },
                  { label: t('detail.created'), value: fmt.dateTime(payment.createdAt) },
                  { label: t('detail.updated'), value: fmt.dateTime(payment.updatedAt) },
                ]}
              />
            </Panel>
            {/* The Merchant API, called from a backend; the dashboard's origin also serves /api. */}
            <CodeBlock
              label={t('detail.retrieve')}
              code={`curl ${window.location.origin}/api/v1/payment-intents/${payment.id} \\\n  -H "Authorization: Bearer $FLOWPAY_API_KEY"`}
            />
          </aside>
        </div>
      </div>

      {/* Not keyed by the refundable amount: a capacity conflict must stay visible (RefundDialog). */}
      <RefundDialog payment={payment} open={refunding} onOpenChange={setRefunding} />
    </>
  )
}

function DetailSkeleton() {
  const { t } = useTranslation('payments')
  return (
    <div className="space-y-5" role="status" aria-label={t('detail.loading')}>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  )
}

function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  const { t } = useTranslation('payments')
  return (
    <Button size="sm" onClick={onClick} loading={loading}>
      {t('detail.refresh')}
    </Button>
  )
}
