import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { PAYMENT_STATUSES, type PaymentFilters, type PaymentStatus } from './types'

/**
 * Filters live in the URL (?status=FAILED&from=2026-11-01) so a filtered view
 * can be bookmarked, shared and survives reload. This hook is the only place
 * that knows the URL format.
 */
export interface PaymentFilterState {
  status: PaymentStatus | 'ALL'
  orderId: string
  from: string // yyyy-mm-dd, local
  to: string
  page: number
}

function isStatus(value: string | null): value is PaymentStatus {
  return PAYMENT_STATUSES.includes(value as PaymentStatus)
}

export function usePaymentFilters() {
  const [params, setParams] = useSearchParams()

  const state: PaymentFilterState = {
    status: isStatus(params.get('status')) ? (params.get('status') as PaymentStatus) : 'ALL',
    orderId: params.get('orderId') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Math.max(0, Number(params.get('page') ?? 0) || 0),
  }

  /** Any filter change resets to the first page. */
  function update(patch: Partial<PaymentFilterState>) {
    const next = { ...state, page: 0, ...patch }
    const out = new URLSearchParams()
    if (next.status !== 'ALL') out.set('status', next.status)
    if (next.orderId) out.set('orderId', next.orderId)
    if (next.from) out.set('from', next.from)
    if (next.to) out.set('to', next.to)
    if (next.page > 0) out.set('page', String(next.page))
    setParams(out, { replace: true })
  }

  const { status, orderId, from, to, page } = state
  const apiFilters = useMemo<PaymentFilters>(
    () => ({
      status: status === 'ALL' ? undefined : status,
      orderId: orderId || undefined,
      createdFrom: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      createdTo: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
      page,
      size: 20,
    }),
    [status, orderId, from, to, page],
  )

  const isFiltered = status !== 'ALL' || Boolean(orderId || from || to)

  return {
    state,
    update,
    apiFilters,
    isFiltered,
    clear: () => setParams(new URLSearchParams(), { replace: true }),
  }
}
