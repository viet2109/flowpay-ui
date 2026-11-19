import { GallerySection, GalleryState, GalleryStatusRow } from '@/components/dev-gallery'
import { deliveryStatus, endpointStatus } from '../catalog'
import type { DeliveryAttempt, DeliveryStatus, WebhookDeliveryDetail } from '../types'
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
const failed = (attemptNo: number, httpStatus: number | null = 500): DeliveryAttempt => ({
  attemptNo,
  startedAt: AT,
  finishedAt: AT,
  httpStatus,
  durationMs: httpStatus === null ? 10_000 : 120,
  errorMessage: httpStatus === null ? 'Read timed out after 10s' : null,
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
    nextAttemptAt: nextAttempt ? AT : null,
    deliveredAt: status === 'DELIVERED' ? AT : null,
    lastHttpStatus: attempts.at(-1)?.httpStatus ?? null,
    lastError: null,
    createdAt: AT,
    updatedAt: AT,
    attempts,
  }
}

const sixFailures = [failed(1), failed(2, 503), failed(3, null), failed(4), failed(5), failed(6)]

const RETRY_CASES: { label: string; delivery: WebhookDeliveryDetail }[] = [
  { label: 'Pending, nothing sent yet', delivery: delivery('PENDING', [], true) },
  { label: 'First attempt in progress', delivery: delivery('DELIVERING', [running(1)]) },
  { label: 'Delivered on the first attempt', delivery: delivery('DELIVERED', [ok(1)]) },
  {
    label: 'Retrying: 3 failed, next attempt scheduled',
    delivery: delivery('RETRYING', [failed(1), failed(2, 503), failed(3, null)], true),
  },
  { label: 'Dead after 6 attempts', delivery: delivery('DEAD', sixFailures) },
  { label: 'Manual retry after Dead succeeded', delivery: delivery('DELIVERED', [...sixFailures, ok(7)]) },
]

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
        description="Delivery sheet: six automatic attempts (now, 10s, 30s, 2m, 10m, 1h), manual retries after."
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
    </>
  )
}
