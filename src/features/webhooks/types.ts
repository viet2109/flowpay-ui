import type { Instant } from '@/lib/api/types'

export const EVENT_TYPES = [
  'payment.processing',
  'payment.succeeded',
  'payment.failed',
  'refund.processing',
  'refund.succeeded',
  'refund.failed',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

export type EndpointStatus = 'ACTIVE' | 'DISABLED'
export const DELIVERY_STATUSES = ['PENDING', 'DELIVERING', 'DELIVERED', 'RETRYING', 'DEAD'] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export interface WebhookEndpoint {
  id: string
  url: string
  status: EndpointStatus
  events: EventType[]
  createdAt: Instant
  updatedAt: Instant
}

/** Create and rotate are the only responses that carry the raw secret. */
export interface CreatedEndpoint extends WebhookEndpoint {
  secret: string
}

export interface RotatedSecret {
  id: string
  secret: string
  updatedAt: Instant
}

export interface WebhookDelivery {
  id: string
  endpointId: string
  eventId: string
  eventType: EventType
  /** Backend WebhookResourceType: PAYMENT_INTENT (pi_…) or REFUND (re_…). */
  resourceType: 'PAYMENT_INTENT' | 'REFUND'
  resourceId: string
  status: DeliveryStatus
  attemptCount: number
  nextAttemptAt: Instant | null
  deliveredAt: Instant | null
  lastHttpStatus: number | null
  lastError: string | null
  createdAt: Instant
  updatedAt: Instant
}

export interface DeliveryAttempt {
  attemptNo: number
  startedAt: Instant
  finishedAt: Instant | null
  httpStatus: number | null
  durationMs: number | null
  errorMessage: string | null
}

export interface WebhookDeliveryDetail extends WebhookDelivery {
  attempts: DeliveryAttempt[]
}

export interface DeliveryFilters {
  status?: DeliveryStatus
  endpointId?: string
  eventType?: EventType
  page?: number
  size?: number
}

export interface EndpointInput {
  url: string
  events: EventType[]
}
