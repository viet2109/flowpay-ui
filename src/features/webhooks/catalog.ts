import type { StatusMap } from '@/components/status-badge'
import type { DeliveryStatus, EndpointStatus } from './types'

export const deliveryStatus: StatusMap<DeliveryStatus> = {
  PENDING: { tone: 'neutral', label: 'delivery.PENDING' },
  DELIVERING: { tone: 'progress', label: 'delivery.DELIVERING', live: true },
  DELIVERED: { tone: 'success', label: 'delivery.DELIVERED' },
  RETRYING: { tone: 'warning', label: 'delivery.RETRYING', live: true },
  DEAD: { tone: 'danger', label: 'delivery.DEAD' },
}

export const endpointStatus: StatusMap<EndpointStatus> = {
  ACTIVE: { tone: 'success', label: 'endpoint.ACTIVE' },
  DISABLED: { tone: 'neutral', label: 'endpoint.DISABLED' },
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
