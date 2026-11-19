import { GallerySection, GalleryState, GalleryStatusRow } from '@/components/dev-gallery'
import { paymentStatus, refundStatus, transactionStatus } from '../status'
import { PAYMENT_STATUSES, type PaymentIntent, type PaymentStatus } from '../types'
import { LifecycleRail } from './LifecycleRail'
import { RefundCapacity } from './RefundCapacity'

/** Fixed timestamps so screenshots are stable. */
const CREATED_AT = '2026-11-18T03:00:00.112Z'
const PROCESSING_AT = '2026-11-18T03:00:00.240Z'
const SETTLED_AT = '2026-11-18T03:00:00.601Z'

function payment(
  status: PaymentStatus,
  amount: number,
  refunded: number,
  refundable: number,
  currency = 'VND',
): PaymentIntent {
  return {
    id: 'pi_01KAR7Q9XWGALLERY0000000',
    orderId: 'ORD-1001',
    description: null,
    amount,
    currency,
    status,
    refundedAmount: refunded,
    refundableAmount: refundable,
    createdAt: CREATED_AT,
    updatedAt: SETTLED_AT,
  }
}

/** Refund capacity cases, including the ones the invariant makes easy to get wrong. */
const CAPACITY_CASES: { label: string; payment: PaymentIntent }[] = [
  { label: 'Not settled yet (Created, Processing, Failed)', payment: payment('PROCESSING', 500_000, 0, 0) },
  { label: 'Succeeded, nothing refunded', payment: payment('SUCCEEDED', 500_000, 0, 500_000) },
  { label: 'Partially refunded', payment: payment('PARTIALLY_REFUNDED', 500_000, 200_000, 300_000) },
  {
    label: 'Partially refunded, 100,000 in flight',
    payment: payment('PARTIALLY_REFUNDED', 500_000, 200_000, 200_000),
  },
  { label: 'Whole amount in flight', payment: payment('SUCCEEDED', 500_000, 0, 0) },
  { label: 'Fully refunded', payment: payment('REFUNDED', 500_000, 500_000, 0) },
  { label: 'USD, two decimals', payment: payment('PARTIALLY_REFUNDED', 25_000, 2_550, 22_450, 'USD') },
]

/** Dev-only section of /dev/ui. Not used by product screens. */
export function PaymentsGallery() {
  return (
    <>
      <GallerySection
        title="Payment statuses"
        description="StatusBadge for every payment, attempt and refund status."
      >
        <GalleryStatusRow name="PaymentIntent" map={paymentStatus} />
        <GalleryStatusRow name="PaymentTransaction" map={transactionStatus} />
        <GalleryStatusRow name="Refund" map={refundStatus} />
      </GallerySection>

      <GallerySection title="LifecycleRail" description="Payment detail header, one per payment status.">
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
          {PAYMENT_STATUSES.map((status) => (
            <GalleryState key={status} label={paymentStatus[status].label}>
              <div className="w-full">
                <LifecycleRail
                  status={status}
                  createdAt={CREATED_AT}
                  processingAt={status === 'CREATED' ? null : PROCESSING_AT}
                  settledAt={status === 'CREATED' || status === 'PROCESSING' ? null : SETTLED_AT}
                />
              </div>
            </GalleryState>
          ))}
        </div>
      </GallerySection>

      <GallerySection
        title="RefundCapacity"
        description="refunded + in flight + refundable = amount, the invariant the backend enforces."
      >
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
          {CAPACITY_CASES.map(({ label, payment }) => (
            <GalleryState key={label} label={label}>
              <div className="w-full">
                <RefundCapacity payment={payment} />
              </div>
            </GalleryState>
          ))}
        </div>
      </GallerySection>
    </>
  )
}
