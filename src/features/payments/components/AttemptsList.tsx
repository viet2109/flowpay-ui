import { CopyableId } from '@/components/copyable-id'
import { StatusBadge } from '@/components/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormat } from '@/i18n'
import { usePaymentTransactions } from '../queries'
import { transactionStatus } from '../status'
import { MerchantApiError } from './MerchantApiError'

/** Provider attempts (PaymentTransaction). One payment may have several. */
export function AttemptsList({ paymentId }: { paymentId: string }) {
  const fmt = useFormat()
  const { data, isPending, error, refetch } = usePaymentTransactions(paymentId)

  if (isPending) return <Skeleton className="m-4 h-12" />
  if (error) return <MerchantApiError error={error} onRetry={refetch} />
  if (data.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-ink-3">
        Not sent to a provider yet. Confirm the payment to start an attempt.
      </p>
    )
  }

  return (
    <ol className="divide-y divide-line">
      {data.map((txn) => {
        const duration = txn.completedAt
          ? new Date(txn.completedAt).getTime() - new Date(txn.startedAt).getTime()
          : null
        return (
          <li key={txn.id} className="grid grid-cols-[2.5rem_1fr_auto] gap-x-3 px-4 py-3">
            <span className="num pt-0.5 font-mono text-xs text-ink-3">#{txn.attemptNo}</span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge {...transactionStatus[txn.status]} />
                <span className="text-xs text-ink-3">{txn.provider}</span>
              </div>
              {txn.failureCode && (
                <p className="text-sm">
                  <span className="font-mono text-xs text-danger">{txn.failureCode}</span>
                  {txn.failureMessage && <span className="text-ink-2"> · {txn.failureMessage}</span>}
                </p>
              )}
              <div className="flex flex-wrap gap-x-3 text-xs text-ink-3">
                <CopyableId value={txn.id} />
                {txn.providerTransactionId && <span className="font-mono">{txn.providerTransactionId}</span>}
              </div>
            </div>
            <div className="num text-right text-xs text-ink-3">
              <div>{fmt.dateTime(txn.startedAt)}</div>
              <div>{txn.completedAt ? fmt.duration(duration) : 'no response'}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
