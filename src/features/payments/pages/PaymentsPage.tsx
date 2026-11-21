import { PlusIcon, ReceiptIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useCanRunPayments } from '@/features/auth'
import { CreatePaymentDialog } from '../components/CreatePaymentDialog'
import { PaymentFiltersBar } from '../components/PaymentFiltersBar'
import { PaymentsTable } from '../components/PaymentsTable'
import { usePayments } from '../queries'
import { usePaymentFilters } from '../use-payment-filters'

export function PaymentsPage() {
  const [creating, setCreating] = useState(false)
  const canRun = useCanRunPayments()

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every PaymentIntent created with your keys, newest first."
        actions={
          canRun && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <PlusIcon weight="bold" />
              New test payment
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
  const filters = usePaymentFilters()
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = usePayments(filters.apiFilters)

  return (
    <div className="space-y-4">
      <PaymentFiltersBar
        state={filters.state}
        onChange={filters.update}
        onClear={filters.clear}
        isFiltered={filters.isFiltered}
      />
      <Panel className={isPlaceholderData ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
        {isPending ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data.items.length === 0 ? (
          filters.isFiltered ? (
            <EmptyState
              icon={<ReceiptIcon />}
              title="No payments match these filters"
              action={
                <Button size="sm" onClick={filters.clear}>
                  Clear filters
                </Button>
              }
            >
              Order ID matches exactly. Date range uses your local time zone.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<ReceiptIcon />}
              title="No payments yet"
              action={
                onCreate && (
                  <Button size="sm" variant="primary" onClick={onCreate}>
                    Create a test payment
                  </Button>
                )
              }
            >
              Payments appear here when your backend calls{' '}
              <code className="font-mono text-xs">POST /payment-intents</code>, or when you create one from
              the dashboard.
            </EmptyState>
          )
        ) : (
          <>
            <PaymentsTable payments={data.items} />
            <Pagination
              meta={data.meta}
              onPageChange={(page) => filters.update({ page })}
              pending={isFetching}
            />
          </>
        )}
      </Panel>
    </div>
  )
}
