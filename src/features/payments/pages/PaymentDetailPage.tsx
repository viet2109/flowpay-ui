import { ArrowCounterClockwiseIcon, LightningIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
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
import { RequireTestKey } from '@/features/test-mode'
import { useIdempotencyKey } from '@/lib/idempotency'
import { useErrorMessage, useFormat } from '@/i18n'
import { useRecentItems } from '@/lib/recent-items'
import { AttemptsList } from '../components/AttemptsList'
import { LifecycleRail } from '../components/LifecycleRail'
import { MerchantApiError } from '../components/MerchantApiError'
import { RefundCapacity } from '../components/RefundCapacity'
import { RefundDialog } from '../components/RefundDialog'
import { RefundsPanel } from '../components/RefundsPanel'
import { useConfirmPayment, usePayment, usePaymentTransactions } from '../queries'
import { canConfirm, canRefund, paymentStatus } from '../status'

export function PaymentDetailPage() {
  const { paymentId = '' } = useParams()
  return (
    <RequireTestKey>
      {/* key: switching payments (e.g. via ⌘K) starts from a clean slate */}
      <PaymentDetail key={paymentId} id={paymentId} />
    </RequireTestKey>
  )
}

function PaymentDetail({ id }: { id: string }) {
  const errorMessage = useErrorMessage()
  const fmt = useFormat()
  const { data: payment, isPending, error, refetch } = usePayment(id)
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
  const { data: attempts } = usePaymentTransactions(id)
  const [refunding, setRefunding] = useState(false)
  const confirm = useConfirmPayment(id)
  const confirmKey = useIdempotencyKey('confirm')

  if (isPending) return <DetailSkeleton />
  if (error) {
    return (
      <>
        <PageHeader title="Payment" back={{ to: '/payments', label: 'Payments' }} />
        <Panel>
          <MerchantApiError error={error} onRetry={refetch} />
        </Panel>
      </>
    )
  }

  const latest = attempts?.at(-1)
  const firstAttempt = attempts?.[0]
  const unknownOutcome = payment.status === 'PROCESSING' && latest?.status === 'UNKNOWN'

  function runConfirm() {
    confirm.mutate(confirmKey.keyFor(id), {
      onSuccess: (result) => {
        if (result.status === 202)
          toast.warning('Provider outcome unknown', { description: 'The payment stays Processing.' })
        else if (result.data.paymentStatus === 'SUCCEEDED') toast.success('Payment succeeded')
        else toast.error('Payment declined', { description: result.data.failureMessage ?? undefined })
      },
      onError: (e) => toast.error(errorMessage(e)),
    })
  }

  return (
    <>
      <PageHeader
        back={{ to: '/payments', label: 'Payments' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Money amount={payment.amount} currency={payment.currency} size="xl" />
            <StatusBadge {...paymentStatus[payment.status]} className="h-6 px-2 text-sm" />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <CopyableId value={payment.id} truncate={false} />
            {payment.orderId && <span>Order {payment.orderId}</span>}
          </span>
        }
        actions={
          <>
            {canConfirm(payment.status) && (
              <Button variant="primary" onClick={runConfirm} loading={confirm.isPending}>
                <LightningIcon weight="fill" />
                Confirm payment
              </Button>
            )}
            {canRefund(payment.status, payment.refundableAmount) && (
              <Button onClick={() => setRefunding(true)}>
                <ArrowCounterClockwiseIcon />
                Refund
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-5">
        <Panel className="px-5 pt-5 pb-4">
          <LifecycleRail
            status={payment.status}
            createdAt={payment.createdAt}
            processingAt={firstAttempt?.startedAt}
            settledAt={latest?.completedAt}
          />
          {unknownOutcome && (
            <Callout tone="warning" className="mt-5" title="Waiting for a definitive provider outcome">
              The provider timed out ({latest.failureCode ?? 'UNKNOWN'}). FlowPay keeps the payment Processing
              instead of guessing it failed, because the charge may have gone through. Automatic
              reconciliation is not part of this simulator, so the status will not change on its own.
            </Callout>
          )}
          {payment.status === 'FAILED' && latest?.failureCode && (
            <Callout tone="danger" className="mt-5" title={`Declined by ${latest.provider}`}>
              <span className="font-mono text-xs">{latest.failureCode}</span>
              {latest.failureMessage && ` · ${latest.failureMessage}`}
            </Callout>
          )}
        </Panel>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-5">
            <Panel>
              <PanelHeader
                title="Refund capacity"
                description="Refunded, in-flight and refundable amounts always add up to the payment amount."
              />
              <div className="p-4">
                <RefundCapacity payment={payment} />
              </div>
            </Panel>
            <Panel>
              <PanelHeader title="Refunds" />
              <RefundsPanel paymentId={payment.id} />
            </Panel>
            <Panel>
              <PanelHeader
                title="Provider attempts"
                description="Each confirmation is recorded as a separate attempt."
              />
              <AttemptsList paymentId={payment.id} />
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel>
              <PanelHeader title="Details" />
              <DescriptionList
                className="px-4 py-1"
                items={[
                  {
                    label: 'Amount',
                    value: <Money amount={payment.amount} currency={payment.currency} size="sm" />,
                  },
                  {
                    label: 'Minor units',
                    value: <span className="num font-mono text-xs">{payment.amount}</span>,
                  },
                  { label: 'Order ID', value: payment.orderId },
                  { label: 'Description', value: payment.description },
                  { label: 'Created', value: fmt.dateTime(payment.createdAt) },
                  { label: 'Updated', value: fmt.dateTime(payment.updatedAt) },
                ]}
              />
            </Panel>
            <CodeBlock
              label="Retrieve via API"
              code={`curl /api/v1/payment-intents/${payment.id} \\\n  -H "Authorization: Bearer $FLOWPAY_KEY"`}
            />
          </aside>
        </div>
      </div>

      {/* Re-mount when capacity changes so the form starts from the current refundable amount. */}
      <RefundDialog
        key={payment.refundableAmount}
        payment={payment}
        open={refunding}
        onOpenChange={setRefunding}
      />
    </>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading payment">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  )
}
