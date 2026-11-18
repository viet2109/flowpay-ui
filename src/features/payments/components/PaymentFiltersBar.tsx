import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import type { PaymentStatus } from '../types'
import type { PaymentFilterState } from '../use-payment-filters'

const STATUS_OPTIONS: { value: PaymentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'SUCCEEDED', label: 'Succeeded' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PARTIALLY_REFUNDED', label: 'Partially refunded' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'CREATED', label: 'Created' },
]

interface Props {
  state: PaymentFilterState
  onChange: (patch: Partial<PaymentFilterState>) => void
  onClear: () => void
  isFiltered: boolean
}

export function PaymentFiltersBar({ state, onChange, onClear, isFiltered }: Props) {
  // Local text state so typing is instant; the URL (and the request) follows after a pause.
  const [orderId, setOrderId] = useState(state.orderId)
  // When the URL changes from outside (e.g. "Clear filters"), follow it.
  // Adjusting state during render is React's recommended alternative to a sync effect.
  const [lastUrlValue, setLastUrlValue] = useState(state.orderId)
  if (state.orderId !== lastUrlValue) {
    setLastUrlValue(state.orderId)
    setOrderId(state.orderId)
  }
  useEffect(() => {
    if (orderId === state.orderId) return
    const id = window.setTimeout(() => onChange({ orderId: orderId.trim() }), 350)
    return () => window.clearTimeout(id)
  }, [orderId, state.orderId, onChange])

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 overflow-x-auto px-1">
        <Segmented
          aria-label="Filter by status"
          value={state.status}
          onChange={(status) => onChange({ status })}
          options={STATUS_OPTIONS}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <Input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Exact order ID"
            aria-label="Order ID"
            leading={<MagnifyingGlassIcon className="size-4" />}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-ink-3">
          <Input
            type="date"
            value={state.from}
            max={state.to || undefined}
            onChange={(e) => onChange({ from: e.target.value })}
            aria-label="Created from"
            className="w-36"
          />
          <span>to</span>
          <Input
            type="date"
            value={state.to}
            min={state.from || undefined}
            onChange={(e) => onChange({ to: e.target.value })}
            aria-label="Created to"
            className="w-36"
          />
        </div>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <XIcon />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
