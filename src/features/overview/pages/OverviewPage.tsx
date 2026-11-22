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
import { ActionError, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useApiKeys } from '@/features/api-keys'
import { useCanRunPayments } from '@/features/auth'
import {
  PaymentsTable,
  paymentStatus,
  usePayments,
  usePaymentStatusCounts,
  type PaymentStatus,
} from '@/features/payments'
import { deliveryStatus, useDeliveryCounts, useEndpoints, useRetryableDeadCount } from '@/features/webhooks'
import { cn } from '@/lib/cn'
import { useFormat } from '@/i18n'

export function OverviewPage() {
  const { t } = useTranslation('overview')

  return (
    <>
      {/* The description does not wait on the merchant: the header (the largest text on a
          phone) paints with the page, and the sidebar already names the business. */}
      <PageHeader title={t('title')} description={t('description')} />
      <div className="space-y-5">
        <SetupChecklist />
        <div className="grid gap-5 lg:grid-cols-2">
          <AttentionPanel />
          <WebhookHealthPanel />
        </div>
        <PaymentMixPanel />
        <RecentPaymentsPanel />
      </div>
    </>
  )
}

/**
 * First-run steps, shown until they are all done. It only appears once every
 * step's state is known: while loading it would flash for a merchant who is set
 * up, and a failed request is not "not done" (the guide is optional, so it hides).
 * Creating payments is OWNER only (useCanRunPayments), so other roles do not get
 * a step they cannot take.
 */
function SetupChecklist() {
  const { t } = useTranslation('overview')
  const keys = useApiKeys()
  const endpoints = useEndpoints()
  const payments = usePayments({ size: 1 })
  const canRunPayments = useCanRunPayments()

  const sources = [keys, endpoints, ...(canRunPayments ? [payments] : [])]
  if (sources.some((q) => q.isPending || q.error)) return null
  const steps = [
    {
      key: 'apiKey',
      done: keys.data?.some((k) => k.status === 'ACTIVE') ?? false,
      label: t('setup.apiKey'),
      to: '/developers/api-keys',
    },
    {
      key: 'endpoint',
      done: endpoints.data?.some((e) => e.status === 'ACTIVE') ?? false,
      label: t('setup.endpoint'),
      to: '/developers/webhooks',
    },
    ...(canRunPayments
      ? [
          {
            key: 'payment',
            done: (payments.data?.meta.totalElements ?? 0) > 0,
            label: t('setup.payment'),
            to: '/payments',
          },
        ]
      : []),
  ]
  if (steps.every((s) => s.done)) return null
  const doneCount = steps.filter((s) => s.done).length

  return (
    <Panel>
      <PanelHeader
        title={t('setup.title')}
        description={t('setup.description')}
        actions={
          <span className="num text-sm text-ink-3">
            {t('setup.progress', { done: doneCount, total: steps.length })}
          </span>
        }
      />
      <ol
        className={cn(
          'grid divide-y divide-line sm:divide-x sm:divide-y-0',
          steps.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        )}
      >
        {steps.map((step, i) => (
          <li key={step.key}>
            <Link
              to={step.to}
              className={cn(
                'flex h-full items-start gap-2.5 px-4 py-3 text-sm hover:bg-surface-hover',
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
  /** null when this count could not be loaded: shown as "—", never as 0. */
  count: number | null
  children: ReactNode
  to: string
  pending?: boolean
}) {
  return (
    <Link to={to} className="group flex items-center gap-3 px-4 py-3 hover:bg-surface-hover">
      {pending ? (
        <Skeleton className="h-6 w-8" />
      ) : (
        <span className={cn('num w-8 text-xl font-medium', count ? 'text-ink' : 'text-ink-3')}>
          {count ?? '—'}
        </span>
      )}
      <span className="flex-1 text-sm text-ink-2">{children}</span>
      <ArrowRightIcon className="size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

function AttentionPanel() {
  const payments = usePaymentStatusCounts()
  const deliveries = useDeliveryCounts(undefined, ['RETRYING'])
  // Only dead deliveries a manual retry can reach: those on disabled endpoints stay dead.
  const dead = useRetryableDeadCount()
  const deadLink =
    dead.endpointIds.length === 1
      ? `/developers/webhooks/deliveries?status=DEAD&endpointId=${dead.endpointIds[0]}`
      : '/developers/webhooks/deliveries?status=DEAD'
  const { t } = useTranslation('overview')
  // A count that failed is unknown, not zero: it never adds up to "All clear".
  const processing = payments.error ? null : payments.counts.PROCESSING
  const retrying = deliveries.error ? null : deliveries.counts.RETRYING
  const deadCount = dead.error ? null : dead.count
  const error = payments.error ?? deliveries.error ?? dead.error
  const total = (processing ?? 0) + (deadCount ?? 0) + (retrying ?? 0)
  const pending = deliveries.isPending || dead.isPending || payments.isPending

  function retry() {
    if (payments.error) payments.refetch()
    if (deliveries.error) deliveries.refetch()
    if (dead.error) dead.refetch()
  }

  return (
    <Panel>
      <PanelHeader
        title={t('attention.title')}
        actions={
          !pending &&
          (error ? (
            <WarningIcon className="size-4 text-warning" />
          ) : total === 0 ? (
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
        <AttentionRow count={processing} pending={payments.isPending} to="/payments?status=PROCESSING">
          {t('attention.processing', { count: processing ?? 0 })}
        </AttentionRow>
        <AttentionRow count={deadCount} pending={dead.isPending} to={deadLink}>
          {t('attention.deadDeliveries', { count: deadCount ?? 0 })}
        </AttentionRow>
        <AttentionRow
          count={retrying}
          pending={deliveries.isPending}
          to="/developers/webhooks/deliveries?status=RETRYING"
        >
          {t('attention.retrying', { count: retrying ?? 0 })}
        </AttentionRow>
      </div>
      {error && !pending && (
        <div className="border-t border-line p-4">
          <ActionError error={error} message={t('attention.someFailed')} />
          <Button size="sm" className="mt-3" onClick={retry}>
            {t('attention.retry')}
          </Button>
        </div>
      )}
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
  const { t } = useTranslation('overview')
  const total = order.reduce((sum, s) => sum + counts[s], 0)
  if (total === 0) return <p className="text-sm text-ink-3">{t('empty')}</p>

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
  const { t } = useTranslation('overview')
  const { counts, isPending, error, refetch } = useDeliveryCounts()
  return (
    <Panel>
      <PanelHeader title={t('deliveries.title')} description={t('deliveries.description')} />
      <div className="p-4">
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
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
  const { t } = useTranslation('overview')
  const { counts, isPending, error, refetch } = usePaymentStatusCounts()
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
      <PanelHeader title={t('payments.title')} description={t('payments.description')} />
      <div className="p-4">
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
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
  const { t } = useTranslation('overview')
  const { data, isPending, error, refetch } = usePayments({ size: 6 })
  return (
    <Panel>
      <PanelHeader
        title={t('recent.title')}
        actions={
          <Link to="/payments" className="text-sm text-ink-2 hover:text-ink">
            {t('recent.viewAll')}
          </Link>
        }
      />
      {isPending ? (
        <div className="p-4">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-3">{t('recent.empty')}</p>
      ) : (
        <PaymentsTable payments={data.items} compact />
      )}
    </Panel>
  )
}
