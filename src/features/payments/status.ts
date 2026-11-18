import type { StatusMap } from '@/components/status-badge'
import type { PaymentStatus, RefundStatus, TransactionStatus } from './types'

export const paymentStatus: StatusMap<PaymentStatus> = {
  CREATED: { tone: 'neutral', label: 'Created' },
  PROCESSING: { tone: 'warning', label: 'Processing', live: true },
  SUCCEEDED: { tone: 'success', label: 'Succeeded' },
  FAILED: { tone: 'danger', label: 'Failed' },
  PARTIALLY_REFUNDED: { tone: 'refund', label: 'Partially refunded' },
  REFUNDED: { tone: 'refund', label: 'Refunded' },
}

export const transactionStatus: StatusMap<TransactionStatus> = {
  PENDING: { tone: 'neutral', label: 'Pending' },
  PROCESSING: { tone: 'warning', label: 'Processing', live: true },
  SUCCEEDED: { tone: 'success', label: 'Succeeded' },
  FAILED: { tone: 'danger', label: 'Declined' },
  UNKNOWN: { tone: 'warning', label: 'Outcome unknown' },
}

export const refundStatus: StatusMap<RefundStatus> = {
  CREATED: { tone: 'neutral', label: 'Created' },
  PROCESSING: { tone: 'warning', label: 'Processing', live: true },
  SUCCEEDED: { tone: 'success', label: 'Refunded' },
  FAILED: { tone: 'danger', label: 'Failed' },
}

/** Actions allowed by the backend state machine (PaymentIntent.java). */
export const canConfirm = (status: PaymentStatus) => status === 'CREATED'
export const canRefund = (status: PaymentStatus, refundable: number) =>
  (status === 'SUCCEEDED' || status === 'PARTIALLY_REFUNDED') && refundable > 0
