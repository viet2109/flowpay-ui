import type { StatusMap } from '@/components/status-badge'
import type { DeliveryAttempt, DeliveryStatus, EndpointStatus } from './types'

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

/**
 * What one attempt tells the merchant. A lease-expired attempt has a finish time
 * but no HTTP status or duration: FlowPay stopped waiting, so the receiver may or
 * may not have got it. It is not a failure the receiver caused.
 */
export type AttemptOutcome = 'in-flight' | 'succeeded' | 'http-failed' | 'failed' | 'unknown'

export const LEASE_EXPIRED = 'DELIVERY_LEASE_EXPIRED'

export function attemptOutcome(attempt: DeliveryAttempt): AttemptOutcome {
  if (attempt.finishedAt === null) return 'in-flight'
  if (attempt.httpStatus !== null)
    return attempt.httpStatus >= 200 && attempt.httpStatus < 300 ? 'succeeded' : 'http-failed'
  return attempt.errorMessage === LEASE_EXPIRED ? 'unknown' : 'failed'
}

export const attemptTone: Record<AttemptOutcome, 'progress' | 'success' | 'danger' | 'warning'> = {
  'in-flight': 'progress',
  succeeded: 'success',
  'http-failed': 'danger',
  failed: 'danger',
  unknown: 'warning',
}

/**
 * Attempt and delivery diagnostics the backend writes (normalized codes, never raw
 * exception text). Not enumerated in the API contract, so unknown codes are shown
 * as they are; these only add an explanation.
 */
export const KNOWN_DIAGNOSTICS = [
  'CONNECT_TIMEOUT',
  'REQUEST_TIMEOUT',
  'TLS_FAILURE',
  'TRANSPORT_FAILURE',
  'INTERRUPTED',
  'INVALID_URL',
  LEASE_EXPIRED,
  'ENDPOINT_DISABLED',
] as const
export type KnownDiagnostic = (typeof KNOWN_DIAGNOSTICS)[number]

export function knownDiagnostic(code: string | null): KnownDiagnostic | null {
  return KNOWN_DIAGNOSTICS.find((d) => d === code) ?? null
}

/** "https://abc.store/hooks/flowpay" -> { host: "abc.store", path: "/hooks/flowpay" } */
export function splitUrl(url: string) {
  try {
    const u = new URL(url)
    return { scheme: `${u.protocol}//`, host: u.host, path: `${u.pathname}${u.search}` }
  } catch {
    return { scheme: '', host: url, path: '' }
  }
}
