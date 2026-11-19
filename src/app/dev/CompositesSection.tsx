import { MagnifyingGlassIcon, PlusIcon, WebhooksLogoIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { CodeBlock } from '@/components/code-block'
import { CopyableId } from '@/components/copyable-id'
import { DescriptionList } from '@/components/description-list'
import { GallerySection, GalleryState } from '@/components/dev-gallery'
import { Money } from '@/components/money'
import { Pagination } from '@/components/pagination'
import { RelativeTime } from '@/components/relative-time'
import { SecretReveal } from '@/components/secret-reveal'
import { EmptyState, ErrorState } from '@/components/states'
import { StatusBadge, type StatusLabel, type Tone } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { ApiError } from '@/lib/api/errors'

/** One status per tone, to show every tone with a real label. */
const TONE_SAMPLES: { tone: Tone; label: StatusLabel }[] = [
  { tone: 'success', label: 'payment.SUCCEEDED' },
  { tone: 'danger', label: 'payment.FAILED' },
  { tone: 'warning', label: 'payment.PROCESSING' },
  { tone: 'refund', label: 'payment.REFUNDED' },
  { tone: 'progress', label: 'delivery.DELIVERING' },
  { tone: 'neutral', label: 'payment.CREATED' },
]
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

const serverError = new ApiError({
  status: 500,
  code: 'INTERNAL_ERROR',
  detail: 'Unexpected error',
  requestId: 'req_01KAR7Q9XWGALLERY000000',
})
const networkError = ApiError.client('NETWORK_ERROR', 'Failed to fetch')

/** Shared FlowPay composites from src/components. Domain sections come from each feature. */
export function CompositesSection() {
  const [page, setPage] = useState(1)
  return (
    <>
      <GallerySection
        title="StatusBadge"
        description="Six tones; a pulsing dot only for states that move by themselves."
      >
        <div className="flex flex-wrap gap-x-4 gap-y-3">
          {TONE_SAMPLES.map(({ tone, label }) => (
            <StatusBadge key={tone} tone={tone} label={label} />
          ))}
          <StatusBadge tone="warning" label="delivery.RETRYING" live />
          <StatusBadge tone="progress" label="delivery.DELIVERING" live />
        </div>
      </GallerySection>

      <GallerySection
        title="Money"
        description="Integer minor units in, amount first and currency code second."
      >
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <GalleryState label="xl (hero)">
            <Money amount={500_000} currency="VND" size="xl" />
          </GalleryState>
          <GalleryState label="lg">
            <Money amount={500_000} currency="VND" size="lg" />
          </GalleryState>
          <GalleryState label="md">
            <Money amount={500_000} currency="VND" />
          </GalleryState>
          <GalleryState label="sm">
            <Money amount={500_000} currency="VND" size="sm" />
          </GalleryState>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-4">
          <GalleryState label="USD, 2 decimals">
            <Money amount={12_345} currency="USD" />
          </GalleryState>
          <GalleryState label="JPY, 0 decimals">
            <Money amount={1_500} currency="JPY" />
          </GalleryState>
          <GalleryState label="KWD, 3 decimals">
            <Money amount={12_345} currency="KWD" />
          </GalleryState>
          <GalleryState label="Zero">
            <Money amount={0} currency="VND" />
          </GalleryState>
          <GalleryState label="Negative (refund)">
            <Money amount={200_000} currency="VND" negative />
          </GalleryState>
          <GalleryState label="Large">
            <Money amount={1_250_000_000} currency="VND" />
          </GalleryState>
        </div>
      </GallerySection>

      <GallerySection
        title="IDs and time"
        description="CopyableId dims the type prefix; click copies the full ID."
      >
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <GalleryState label="Payment">
            <CopyableId value="pi_01KAR7Q9XWB5S3M8ZK2Y6T4N1F" />
          </GalleryState>
          <GalleryState label="Refund">
            <CopyableId value="re_01KAR7RB2C7D9E1F3G5H7J9K2M" />
          </GalleryState>
          <GalleryState label="Endpoint">
            <CopyableId value="wep_01KAR7S0P4Q6R8T0V2W4X6Y8Z0" />
          </GalleryState>
          <GalleryState label="Short, not truncated">
            <CopyableId value="evt_01KAR7" />
          </GalleryState>
          <GalleryState label="truncate={false}">
            <CopyableId value="req_01KAR7Q9XWGALLERY000000" truncate={false} />
          </GalleryState>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-4 text-sm">
          <GalleryState label="20 s ago">
            <RelativeTime value={ago(20_000)} />
          </GalleryState>
          <GalleryState label="5 min ago">
            <RelativeTime value={ago(5 * 60_000)} />
          </GalleryState>
          <GalleryState label="3 h ago">
            <RelativeTime value={ago(3 * 3_600_000)} />
          </GalleryState>
          <GalleryState label="2 days ago">
            <RelativeTime value={ago(2 * 86_400_000)} />
          </GalleryState>
          <GalleryState label="Missing">
            <RelativeTime value={null} />
          </GalleryState>
        </div>
      </GallerySection>

      <GallerySection title="Record details" description="DescriptionList, CodeBlock and SecretReveal.">
        <div className="grid gap-6 lg:grid-cols-2">
          <DescriptionList
            items={[
              { label: 'Payment', value: <CopyableId value="pi_01KAR7Q9XWB5S3M8ZK2Y6T4N1F" /> },
              { label: 'Amount', value: <Money amount={500_000} currency="VND" /> },
              { label: 'Status', value: <StatusBadge tone="refund" label="payment.PARTIALLY_REFUNDED" /> },
              { label: 'Order', value: 'ORD-1001' },
              { label: 'Hidden row', value: 'not shown', hidden: true },
            ]}
          />
          <div className="space-y-4">
            <CodeBlock
              label="FlowPay-Signature"
              code="t=1763434800,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd"
            />
            <SecretReveal label="Signing secret" secret="whsec_gallery_example_not_a_real_secret" />
          </div>
        </div>
      </GallerySection>

      <GallerySection title="Empty, error and paging" description="Every data view handles these states.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <EmptyState
              icon={<WebhooksLogoIcon />}
              title="No webhook endpoints yet"
              action={
                <Button size="sm" variant="primary">
                  <PlusIcon />
                  Add endpoint
                </Button>
              }
            >
              Add a URL to receive signed events when payments and refunds change.
            </EmptyState>
          </Panel>
          <Panel>
            <EmptyState
              icon={<MagnifyingGlassIcon />}
              title="No deliveries match these filters"
              action={<Button size="sm">Clear filters</Button>}
            />
          </Panel>
          <Panel>
            <ErrorState error={serverError} onRetry={() => {}} />
          </Panel>
          <Panel>
            <ErrorState error={networkError} onRetry={() => {}} />
          </Panel>
          <Panel className="lg:col-span-2">
            <Pagination
              meta={{
                page,
                size: 20,
                totalElements: 87,
                totalPages: 5,
                hasNext: page < 4,
                hasPrevious: page > 0,
              }}
              onPageChange={setPage}
            />
          </Panel>
        </div>
      </GallerySection>
    </>
  )
}
