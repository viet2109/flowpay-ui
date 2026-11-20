import { ArrowRightIcon, CheckCircleIcon, CircleIcon, WarningIcon } from '@phosphor-icons/react'
import type { StatusMap } from '@/components/status-badge'
import { useTranslation } from 'react-i18next'
import { m } from 'motion/react'
import { EASE_OUT } from '@/lib/motion'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { useApiKeys } from '@/features/api-keys'
import { useMerchant } from '@/features/merchant'
import {
  MerchantApiError,
  PaymentsTable,
  paymentStatus,
  usePayments,
  usePaymentStatusCounts,
  type PaymentStatus,
} from '@/features/payments'
import { ConnectKeyPanel, useTestKey } from '@/features/test-mode'
import { deliveryStatus, useDeliveryCounts, useEndpoints } from '@/features/webhooks'
import { cn } from '@/lib/cn'
import { useFormat } from '@/i18n'

export function OverviewPage() {
  const { data: merchant } = useMerchant()
  const hasKey = useTestKey((s) => Boolean(s.key))

  return (
    <>
      <PageHeader
        title="Overview"
        description={merchant ? `What needs your attention at ${merchant.name}.` : ' '}
      />
      <div className="space-y-5">
        <SetupChecklist />
        <div className="grid gap-5 lg:grid-cols-2">
          <AttentionPanel />
          <WebhookHealthPanel />
        </div>
        {hasKey ? (
          <>
            <PaymentMixPanel />
            <RecentPaymentsPanel />
          </>
        ) : (
          <ConnectKeyPanel />
        )}
      </div>
    </>
  )
}

/** Only shown until the four first-run steps are done. */
function SetupChecklist() {
  const keys = useApiKeys()
  const endpoints = useEndpoints()
  const hasTestKey = useTestKey((s) => Boolean(s.key))
  const payments = usePayments({ size: 1 })

  if (keys.isPending || endpoints.isPending) return null
  const steps = [
    {
      done: keys.data?.some((k) => k.status === 'ACTIVE') ?? false,
      label: 'Create an API key',
      to: '/developers/api-keys',
    },
    { done: hasTestKey, label: 'Connect a test key to this dashboard', to: '/developers/api-keys' },
    {
      done: endpoints.data?.some((e) => e.status === 'ACTIVE') ?? false,
      label: 'Add a webhook endpoint',
      to: '/developers/webhooks',
    },
    {
      done: (payments.data?.meta.totalElements ?? 0) > 0,
      label: 'Create your first test payment',
      to: '/payments',
    },
  ]
  if (steps.every((s) => s.done)) return null
  const doneCount = steps.filter((s) => s.done).length

  return (
    <Panel>
      <PanelHeader
        title="Get set up"
        description="Four steps to see the full payment, ledger and webhook flow against the simulator."
        actions={<span className="num text-sm text-ink-3">{doneCount}/4</span>}
      />
      <ol className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {steps.map((step, i) => (
          <li key={step.label}>
            <Link
              to={step.to}
              className={cn(
                'flex items-start gap-2.5 px-4 py-3 text-sm hover:bg-surface-hover',
                step.done && 'text-ink-3',
              )}
            >
              {step.done ? (
                <CheckCircleIcon weight="fill" className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <CircleIcon className="mt-0.5 size-4 shrink-0 text-ink-3" />
              )}
              <span className={cn(step.done && 'line-through decoration-line-strong')}>
                <span className="num mr-1 text-ink-3">{i + 1}.</span>
                {step.label}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function AttentionRow({
  count,
  children,
  to,
  pending,
}: {
  count: number
  children: ReactNode
  to: string
  pending?: boolean
}) {
  return (
    <Link to={to} className="group flex items-center gap-3 px-4 py-3 hover:bg-surface-hover">
      {pending ? (
        <Skeleton className="h-6 w-8" />
      ) : (
        <span className={cn('num w-8 text-xl font-medium', count > 0 ? 'text-ink' : 'text-ink-3')}>
          {count}
        </span>
      )}
      <span className="flex-1 text-sm text-ink-2">{children}</span>
      <ArrowRightIcon className="size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

function AttentionPanel() {
  const hasKey = useTestKey((s) => Boolean(s.key))
  const payments = usePaymentStatusCounts()
  const deliveries = useDeliveryCounts(undefined, ['DEAD', 'RETRYING'])
  const processing = hasKey ? payments.counts.PROCESSING : 0
  const total = processing + deliveries.counts.DEAD + deliveries.counts.RETRYING
  const pending = deliveries.isPending || (hasKey && payments.isPending)
  const { t } = useTranslation('overview')

  return (
    <Panel>
      <PanelHeader
        title={t('attention.title')}
        actions={
          !pending &&
          (total === 0 ? (
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircleIcon weight="fill" className="size-3.5" />
              {t('attention.allClear')}
            </span>
          ) : (
            <WarningIcon className="size-4 text-warning" />
          ))
        }
      />
      <div className="divide-y divide-line">
        {hasKey && (
          <AttentionRow count={processing} pending={payments.isPending} to="/payments?status=PROCESSING">
            {t('attention.unknownOutcome', { count: processing })}
          </AttentionRow>
        )}
        <AttentionRow
          count={deliveries.counts.DEAD}
          pending={deliveries.isPending}
          to="/developers/webhooks/deliveries?status=DEAD"
        >
          {t('attention.deadDeliveries', { count: deliveries.counts.DEAD })}
        </AttentionRow>
        <AttentionRow
          count={deliveries.counts.RETRYING}
          pending={deliveries.isPending}
          to="/developers/webhooks/deliveries?status=RETRYING"
        >
          {t('attention.retrying', { count: deliveries.counts.RETRYING })}
        </AttentionRow>
      </div>
    </Panel>
  )
}

const BAR_TONE: Record<string, string> = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  refund: 'bg-refund',
  progress: 'bg-progress',
  neutral: 'bg-ink-3',
}

/** One stacked bar + legend. Each segment links to the filtered list. */
function DistributionBar<S extends string>({
  counts,
  meta,
  order,
  hrefFor,
}: {
  counts: Record<S, number>
  meta: StatusMap<S>
  order: S[]
  hrefFor: (s: S) => string
}) {
  const { t: tStatus } = useTranslation('status')
  const fmt = useFormat()
  const total = order.reduce((sum, s) => sum + counts[s], 0)
  if (total === 0) return <p className="text-sm text-ink-3">Nothing here yet.</p>

  return (
    <div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-sunken">
        {order
          .filter((s) => counts[s] > 0)
          .map((s, i) => (
            <m.div
              key={s}
              className={BAR_TONE[meta[s].tone]}
              initial={{ width: 0 }}
              animate={{ width: `${(counts[s] / total) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: EASE_OUT }}
            />
          ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {order.map((s) => (
          <li key={s}>
            <Link to={hrefFor(s)} className="group flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-ink-2 group-hover:text-ink">
                <span className={cn('size-2 rounded-full', BAR_TONE[meta[s].tone])} />
                {tStatus(meta[s].label)}
              </span>
              <span className="num text-ink">{fmt.number(counts[s])}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function WebhookHealthPanel() {
  const { counts, isPending, error } = useDeliveryCounts()
  return (
    <Panel>
      <PanelHeader title="Webhook deliveries" description="All time, by current status." />
      <div className="p-4">
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : error ? (
          <p className="text-sm text-danger">Could not load delivery counts.</p>
        ) : (
          <DistributionBar
            counts={counts}
            meta={deliveryStatus}
            order={['DELIVERED', 'RETRYING', 'DEAD', 'PENDING', 'DELIVERING']}
            hrefFor={(s) => `/developers/webhooks/deliveries?status=${s}`}
          />
        )}
      </div>
    </Panel>
  )
}

function PaymentMixPanel() {
  const { counts, isPending, error } = usePaymentStatusCounts()
  const order: PaymentStatus[] = [
    'SUCCEEDED',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'PROCESSING',
    'FAILED',
    'CREATED',
  ]
  return (
    <Panel>
      <PanelHeader title="Payments by status" description="All payments for the connected key's merchant." />
      <div className="p-4">
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : error ? (
          <MerchantApiError error={error} />
        ) : (
          <DistributionBar
            counts={counts}
            meta={paymentStatus}
            order={order}
            hrefFor={(s) => `/payments?status=${s}`}
          />
        )}
      </div>
    </Panel>
  )
}

function RecentPaymentsPanel() {
  const { data, isPending, error, refetch } = usePayments({ size: 6 })
  return (
    <Panel>
      <PanelHeader
        title="Recent payments"
        actions={
          <Link to="/payments" className="text-sm text-ink-2 hover:text-ink">
            View all
          </Link>
        }
      />
      {isPending ? (
        <div className="p-4">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <MerchantApiError error={error} onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-3">No payments yet.</p>
      ) : (
        <PaymentsTable payments={data.items} compact />
      )}
    </Panel>
  )
}
