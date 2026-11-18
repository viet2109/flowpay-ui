import type { StatusMap } from '@/components/status-badge'
import type { DeliveryStatus, EndpointStatus, EventType } from './types'

/** Public event catalog (docs/api-contract.md §15) with merchant-facing meaning. */
export const EVENT_INFO: Record<
  EventType,
  { resource: 'Payment' | 'Refund'; outcome: string; description: string }
> = {
  'payment.processing': {
    resource: 'Payment',
    outcome: 'Processing',
    description: 'Sent to the provider; outcome not known yet.',
  },
  'payment.succeeded': {
    resource: 'Payment',
    outcome: 'Succeeded',
    description: 'Provider confirmed the charge.',
  },
  'payment.failed': { resource: 'Payment', outcome: 'Failed', description: 'Provider declined the charge.' },
  'refund.processing': {
    resource: 'Refund',
    outcome: 'Processing',
    description: 'Refund outcome not known yet.',
  },
  'refund.succeeded': {
    resource: 'Refund',
    outcome: 'Succeeded',
    description: 'Money returned to the customer.',
  },
  'refund.failed': { resource: 'Refund', outcome: 'Failed', description: 'Provider rejected the refund.' },
}

export const deliveryStatus: StatusMap<DeliveryStatus> = {
  PENDING: { tone: 'neutral', label: 'Pending' },
  DELIVERING: { tone: 'progress', label: 'Delivering', live: true },
  DELIVERED: { tone: 'success', label: 'Delivered' },
  RETRYING: { tone: 'warning', label: 'Retrying', live: true },
  DEAD: { tone: 'danger', label: 'Dead' },
}

export const endpointStatus: StatusMap<EndpointStatus> = {
  ACTIVE: { tone: 'success', label: 'Active' },
  DISABLED: { tone: 'neutral', label: 'Disabled' },
}

/**
 * Backend retry policy (BR-WEB-006): first attempt immediately, then 5 retries
 * after these base delays with 0–20% jitter. Six normal attempts, then DEAD.
 */
export const RETRY_SCHEDULE = ['now', '10s', '30s', '2m', '10m', '1h'] as const
export const MAX_AUTOMATIC_ATTEMPTS = RETRY_SCHEDULE.length

/** "https://abc.store/hooks/flowpay" -> { host: "abc.store", path: "/hooks/flowpay" } */
export function splitUrl(url: string) {
  try {
    const u = new URL(url)
    return { scheme: `${u.protocol}//`, host: u.host, path: `${u.pathname}${u.search}` }
  } catch {
    return { scheme: '', host: url, path: '' }
  }
}
