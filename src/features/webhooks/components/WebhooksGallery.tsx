import { GallerySection, GalleryState, GalleryStatusRow } from '@/components/dev-gallery'
import { deliveryStatus, endpointStatus } from '../catalog'
import type { DeliveryAttempt, DeliveryStatus, WebhookDeliveryDetail } from '../types'
import { AttemptTimeline } from './AttemptTimeline'
import { RetryTrack } from './RetryTrack'

const AT = '2026-11-18T03:00:00Z'

const ok = (attemptNo: number): DeliveryAttempt => ({
  attemptNo,
  startedAt: AT,
  finishedAt: AT,
  httpStatus: 200,
  durationMs: 84,
  errorMessage: null,
})
const failed = (attemptNo: number, httpStatus = 500): DeliveryAttempt => ({
  attemptNo,
  startedAt: AT,
  finishedAt: AT,
  httpStatus,
  durationMs: 120,
  errorMessage: 'HTTP_STATUS',
})
/** No HTTP response: the backend writes a normalized code (never exception text). */
const timedOut = (attemptNo: number): DeliveryAttempt => ({
  attemptNo,
  startedAt: AT,
  finishedAt: AT,
  httpStatus: null,
  durationMs: 5_000,
  errorMessage: 'REQUEST_TIMEOUT',
})
/** The worker lost its lease: finished, but status and duration are unknown. */
const leaseExpired = (attemptNo: number): DeliveryAttempt => ({
  attemptNo,
  startedAt: AT,
  finishedAt: AT,
  httpStatus: null,
  durationMs: null,
  errorMessage: 'DELIVERY_LEASE_EXPIRED',
})
const running = (attemptNo: number): DeliveryAttempt => ({
  attemptNo,
  startedAt: AT,
  finishedAt: null,
  httpStatus: null,
  durationMs: null,
  errorMessage: null,
})

function delivery(
  status: DeliveryStatus,
  attempts: DeliveryAttempt[],
  nextAttempt = false,
): WebhookDeliveryDetail {
  return {
    id: 'wdl_01KAR7Q9XWGALLERY000000',
    endpointId: 'wep_01KAR7Q9XWGALLERY000000',
    eventId: 'evt_01KAR7Q9XWGALLERY000000',
    eventType: 'payment.succeeded',
    resourceType: 'PAYMENT_INTENT',
    resourceId: 'pi_01KAR7Q9XWGALLERY0000000',
    status,
    attemptCount: attempts.length,
    // In the future, so the summary reads "next in 25 sec" rather than a date long past.
    nextAttemptAt: nextAttempt ? new Date(Date.now() + 25_000).toISOString() : null,
    deliveredAt: status === 'DELIVERED' ? AT : null,
    lastHttpStatus: attempts.at(-1)?.httpStatus ?? null,
    lastError: status === 'DELIVERED' ? null : (attempts.at(-1)?.errorMessage ?? null),
    createdAt: AT,
    updatedAt: AT,
    attempts,
  }
}

const sixFailures = [failed(1), failed(2, 503), timedOut(3), failed(4), failed(5), failed(6)]

const RETRY_CASES: { label: string; delivery: WebhookDeliveryDetail }[] = [
  { label: 'Pending, nothing sent yet', delivery: delivery('PENDING', [], true) },
  { label: 'First attempt in progress', delivery: delivery('DELIVERING', [running(1)]) },
  { label: 'Delivered on the first attempt', delivery: delivery('DELIVERED', [ok(1)]) },
  {
    label: 'Retrying: 3 failed, next attempt scheduled',
    delivery: delivery('RETRYING', [failed(1), failed(2, 503), timedOut(3)], true),
  },
  {
    label: 'Lease expired, then delivered',
    delivery: delivery('DELIVERED', [leaseExpired(1), ok(2)]),
  },
  { label: 'Dead after 6 attempts', delivery: delivery('DEAD', sixFailures) },
  { label: 'Manual retry after Dead succeeded', delivery: delivery('DELIVERED', [...sixFailures, ok(7)]) },
  {
    label: 'Manual retry scheduled after Dead',
    delivery: delivery('RETRYING', sixFailures, true),
  },
]

/** One attempt of each outcome, oldest first. */
const TIMELINE = [timedOut(1), failed(2, 503), leaseExpired(3), ok(4), running(5)]

/** Dev-only section of /dev/ui. Not used by product screens. */
export function WebhooksGallery() {
  return (
    <>
      <GallerySection title="Webhook statuses">
        <GalleryStatusRow name="WebhookDelivery" map={deliveryStatus} />
        <GalleryStatusRow name="WebhookEndpoint" map={endpointStatus} />
      </GallerySection>

      <GallerySection
        title="RetryTrack"
        description="Delivery sheet: six automatic attempts (now, 10s, 30s, 2m, 10m, 1h), manual retries after. The summary line uses the real next attempt time."
      >
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
          {RETRY_CASES.map(({ label, delivery }) => (
            <GalleryState key={label} label={label}>
              <div className="w-full">
                <RetryTrack delivery={delivery} />
              </div>
            </GalleryState>
          ))}
        </div>
      </GallerySection>

      <GallerySection
        title="AttemptTimeline"
        description="Delivery sheet: HTTP failure, no response, lease expired (outcome unknown), success, in flight."
      >
        <div className="max-w-md">
          <AttemptTimeline attempts={TIMELINE} />
        </div>
      </GallerySection>
    </>
  )
}
