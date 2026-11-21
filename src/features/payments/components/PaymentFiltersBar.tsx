import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { paymentStatus } from '../status'
import type { PaymentStatus } from '../types'
import type { PaymentFilterState } from '../use-payment-filters'

/** Most looked-for first: what settled, what is stuck, what failed. */
const STATUS_ORDER: PaymentStatus[] = [
  'SUCCEEDED',
  'PROCESSING',
  'FAILED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'CREATED',
]

interface Props {
  state: PaymentFilterState
  onChange: (patch: Partial<PaymentFilterState>) => void
  onClear: () => void
  isFiltered: boolean
  /** The start date is after the end date; the range is not applied. */
  rangeInverted: boolean
}

export function PaymentFiltersBar({ state, onChange, onClear, isFiltered, rangeInverted }: Props) {
  const { t } = useTranslation('payments')
  const { t: tStatus } = useTranslation('status')
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
          aria-label={t('filters.status')}
          value={state.status}
          onChange={(status) => onChange({ status })}
          options={[
            { value: 'ALL' as const, label: t('filters.all') },
            ...STATUS_ORDER.map((s) => ({ value: s, label: tStatus(paymentStatus[s].label) })),
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <Input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder={t('filters.orderIdPlaceholder')}
            aria-label={t('filters.orderId')}
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
            aria-label={t('filters.from')}
            aria-invalid={rangeInverted || undefined}
            aria-describedby={rangeInverted ? 'payment-range-error' : undefined}
            className="w-36"
          />
          <span>{t('filters.rangeSeparator')}</span>
          <Input
            type="date"
            value={state.to}
            min={state.from || undefined}
            onChange={(e) => onChange({ to: e.target.value })}
            aria-label={t('filters.to')}
            aria-invalid={rangeInverted || undefined}
            aria-describedby={rangeInverted ? 'payment-range-error' : undefined}
            className="w-36"
          />
        </div>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <XIcon />
            {t('filters.clear')}
          </Button>
        )}
      </div>
      {rangeInverted && (
        <p id="payment-range-error" role="alert" className="text-xs text-danger">
          {t('filters.rangeInverted')}
        </p>
      )}
    </div>
  )
}
