import type { StatusMap } from '@/components/status-badge'
import type { PaymentStatus, RefundStatus, TransactionStatus } from './types'

export const paymentStatus: StatusMap<PaymentStatus> = {
  CREATED: { tone: 'neutral', label: 'payment.CREATED' },
  PROCESSING: { tone: 'warning', label: 'payment.PROCESSING', live: true },
  SUCCEEDED: { tone: 'success', label: 'payment.SUCCEEDED' },
  FAILED: { tone: 'danger', label: 'payment.FAILED' },
  PARTIALLY_REFUNDED: { tone: 'refund', label: 'payment.PARTIALLY_REFUNDED' },
  REFUNDED: { tone: 'refund', label: 'payment.REFUNDED' },
}

export const transactionStatus: StatusMap<TransactionStatus> = {
  PENDING: { tone: 'neutral', label: 'transaction.PENDING' },
  PROCESSING: { tone: 'warning', label: 'transaction.PROCESSING', live: true },
  SUCCEEDED: { tone: 'success', label: 'transaction.SUCCEEDED' },
  FAILED: { tone: 'danger', label: 'transaction.FAILED' },
  UNKNOWN: { tone: 'warning', label: 'transaction.UNKNOWN' },
}

export const refundStatus: StatusMap<RefundStatus> = {
  CREATED: { tone: 'neutral', label: 'refund.CREATED' },
  PROCESSING: { tone: 'warning', label: 'refund.PROCESSING', live: true },
  SUCCEEDED: { tone: 'success', label: 'refund.SUCCEEDED' },
  FAILED: { tone: 'danger', label: 'refund.FAILED' },
}

/** Actions allowed by the backend state machine (PaymentIntent.java). */
export const canConfirm = (status: PaymentStatus) => status === 'CREATED'
export const canRefund = (status: PaymentStatus, refundable: number) =>
  (status === 'SUCCEEDED' || status === 'PARTIALLY_REFUNDED') && refundable > 0
