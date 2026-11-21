import { useSearchParams } from 'react-router'
import { PAYMENT_STATUSES, type PaymentFilters, type PaymentStatus } from './types'

/**
 * Filters live in the URL (?status=FAILED&from=2026-11-01&size=50) so a filtered
 * view can be bookmarked, shared and survives reload. This hook is the only place
 * that knows the URL format. Values the backend would reject are ignored, not sent
 * (docs/api-contract.md §11 List: page ≥ 0, size 1–100, createdFrom ≤ createdTo).
 */
export interface PaymentFilterState {
  status: PaymentStatus | 'ALL'
  orderId: string
  from: string // yyyy-mm-dd, local
  to: string
  page: number
  size: number
}

export const PAGE_SIZES = [20, 50, 100] as const
const DEFAULT_SIZE = 20

const isStatus = (value: string | null): value is PaymentStatus =>
  PAYMENT_STATUSES.includes(value as PaymentStatus)

/** A real calendar date in yyyy-mm-dd (2026-02-30 is not), or ''. */
function validDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime()) && localIsoDate(date) === value ? value : ''
}

function localIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parsePaymentFilters(params: URLSearchParams): PaymentFilterState {
  const size = Number(params.get('size'))
  return {
    status: isStatus(params.get('status')) ? (params.get('status') as PaymentStatus) : 'ALL',
    orderId: params.get('orderId')?.trim() ?? '',
    from: validDate(params.get('from')),
    to: validDate(params.get('to')),
    page: Math.max(0, Math.floor(Number(params.get('page') ?? 0)) || 0),
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_SIZE,
  }
}

/** The start date is after the end date: the backend would answer 400, so nothing is sent. */
export const isRangeInverted = ({ from, to }: Pick<PaymentFilterState, 'from' | 'to'>) =>
  Boolean(from && to && from > to)

/** Local day boundaries as instants: from 00:00 of `from` to the last millisecond of `to`. */
export function toApiFilters(state: PaymentFilterState): PaymentFilters {
  const inverted = isRangeInverted(state)
  return {
    status: state.status === 'ALL' ? undefined : state.status,
    orderId: state.orderId || undefined,
    createdFrom: state.from && !inverted ? new Date(`${state.from}T00:00:00`).toISOString() : undefined,
    createdTo: state.to && !inverted ? new Date(`${state.to}T23:59:59.999`).toISOString() : undefined,
    page: state.page,
    size: state.size,
  }
}

export function usePaymentFilters() {
  const [params, setParams] = useSearchParams()
  const state = parsePaymentFilters(params)

  /** Any filter change resets to the first page; page size is kept. */
  function update(patch: Partial<PaymentFilterState>) {
    const next = { ...state, page: 0, ...patch }
    const out = new URLSearchParams()
    if (next.status !== 'ALL') out.set('status', next.status)
    if (next.orderId.trim()) out.set('orderId', next.orderId.trim())
    if (next.from) out.set('from', next.from)
    if (next.to) out.set('to', next.to)
    if (next.page > 0) out.set('page', String(next.page))
    if (next.size !== DEFAULT_SIZE) out.set('size', String(next.size))
    setParams(out, { replace: true })
  }

  // A new object each render is fine: query keys are compared by value.
  const apiFilters = toApiFilters(state)
  const isFiltered = state.status !== 'ALL' || Boolean(state.orderId || state.from || state.to)

  return {
    state,
    update,
    apiFilters,
    isFiltered,
    rangeInverted: isRangeInverted(state),
    /** Clears the filters and the page; the chosen page size stays. */
    clear: () => update({ status: 'ALL', orderId: '', from: '', to: '' }),
  }
}
