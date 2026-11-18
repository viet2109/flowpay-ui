import type { Instant } from '@/lib/api/types'

/** Backend enums (payment/domain, refund/domain). */
export const PAYMENT_STATUSES = [
  'CREATED',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN'
export type RefundStatus = 'CREATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'

/** All amounts are integer minor units of `currency`. */
export interface PaymentIntent {
  id: string
  orderId: string | null
  description: string | null
  amount: number
  currency: string
  status: PaymentStatus
  refundedAmount: number
  refundableAmount: number
  createdAt: Instant
  updatedAt: Instant
}

/** The create response (and its replay) has no `updatedAt` (CreatePaymentIntentResponse). */
export type CreatedPaymentIntent = Omit<PaymentIntent, 'updatedAt'>

export interface PaymentTransaction {
  id: string
  attemptNo: number
  provider: string
  providerTransactionId: string | null
  status: TransactionStatus
  failureCode: string | null
  failureMessage: string | null
  startedAt: Instant
  completedAt: Instant | null
}

export interface ConfirmResult {
  paymentId: string
  paymentStatus: PaymentStatus
  transactionId: string
  transactionStatus: TransactionStatus
  provider: string
  providerTransactionId: string | null
  failureCode: string | null
  failureMessage: string | null
}

export interface Refund {
  id: string
  paymentId: string
  amount: number
  currency: string
  status: RefundStatus
  reason: string | null
  provider: string
  providerRefundId: string | null
  failureCode: string | null
  failureMessage: string | null
  createdAt: Instant
  updatedAt: Instant
  completedAt: Instant | null
}

export interface PaymentFilters {
  status?: PaymentStatus
  orderId?: string
  createdFrom?: string
  createdTo?: string
  page?: number
  size?: number
}

export interface CreatePaymentInput {
  amount: number
  currency: string
  orderId?: string
  description?: string
}

export interface CreateRefundInput {
  amount: number
  reason?: string
}
