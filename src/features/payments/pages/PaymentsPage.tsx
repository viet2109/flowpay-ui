import { PlusIcon, ReceiptIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { EmptyState, ErrorState, RefreshFailed } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useCanRunPayments } from '@/features/auth'
import { CreatePaymentDialog } from '../components/CreatePaymentDialog'
import { PaymentFiltersBar } from '../components/PaymentFiltersBar'
import { PaymentsTable } from '../components/PaymentsTable'
import { usePayments } from '../queries'
import { PAGE_SIZES, usePaymentFilters } from '../use-payment-filters'

export function PaymentsPage() {
  const { t } = useTranslation('payments')
  const [creating, setCreating] = useState(false)
  const canRun = useCanRunPayments()

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          canRun && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <PlusIcon weight="bold" />
              {t('newPayment')}
            </Button>
          )
        }
      />
      <PaymentsList onCreate={canRun ? () => setCreating(true) : undefined} />
      {canRun && <CreatePaymentDialog open={creating} onOpenChange={setCreating} />}
    </>
  )
}

function PaymentsList({ onCreate }: { onCreate?: () => void }) {
  const { t } = useTranslation('payments')
  const filters = usePaymentFilters()
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = usePayments(filters.apiFilters)
  // A link can point past the end (the list shrank, or a hand-edited page number).
  const pastEnd = data && data.items.length === 0 && data.meta.totalElements > 0

  return (
    <div className="space-y-4">
      <PaymentFiltersBar
        state={filters.state}
        onChange={filters.update}
        onClear={filters.clear}
        isFiltered={filters.isFiltered}
        rangeInverted={filters.rangeInverted}
      />
      {/* A failed refresh with rows on screen keeps them and says they may be stale. */}
      {error && data && <RefreshFailed error={error} onRetry={refetch} />}
      <Panel className={isPlaceholderData ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
        {isPending ? (
          <TableSkeleton />
        ) : !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : pastEnd ? (
          <EmptyState
            icon={<ReceiptIcon />}
            title={t('pastEnd.title')}
            action={
              <Button size="sm" onClick={() => filters.update({ page: 0 })}>
                {t('pastEnd.action')}
              </Button>
            }
          >
            {t('pastEnd.body')}
          </EmptyState>
        ) : data.items.length === 0 ? (
          filters.isFiltered ? (
            <EmptyState
              icon={<ReceiptIcon />}
              title={t('filtered.title')}
              action={
                <Button size="sm" onClick={filters.clear}>
                  {t('filters.clear')}
                </Button>
              }
            >
              {t('filtered.body')}
            </EmptyState>
          ) : (
            <EmptyState
              icon={<ReceiptIcon />}
              title={t('empty.title')}
              action={
                onCreate && (
                  <Button size="sm" variant="primary" onClick={onCreate}>
                    {t('empty.action')}
                  </Button>
                )
              }
            >
              <Trans
                t={t}
                i18nKey="empty.body"
                components={{ code: <code className="font-mono text-xs" /> }}
              />
            </EmptyState>
          )
        ) : (
          <>
            <PaymentsTable payments={data.items} />
            <Pagination
              meta={data.meta}
              onPageChange={(page) => filters.update({ page })}
              pending={isFetching}
              pageSizes={PAGE_SIZES}
              onPageSizeChange={(size) => filters.update({ size })}
            />
          </>
        )}
      </Panel>
    </div>
  )
}
