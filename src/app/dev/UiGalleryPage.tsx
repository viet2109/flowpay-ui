import { DotsThreeIcon, MoonIcon, PencilSimpleIcon, ProhibitIcon, TrashIcon } from '@phosphor-icons/react'
import { lazy, Suspense, useState, type ComponentType } from 'react'
import { Callout } from '@/components/callout'
import { GallerySection, GalleryState } from '@/components/dev-gallery'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Segmented } from '@/components/ui/segmented'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip } from '@/components/ui/tooltip'
import { apiKeysGallery } from '@/features/api-keys'
import { merchantGallery } from '@/features/merchant'
import { paymentsGallery } from '@/features/payments'
import { webhooksGallery } from '@/features/webhooks'
import { useTheme } from '@/lib/theme'
import { CompositesSection } from './CompositesSection'

/**
 * Dev-only catalogue: every primitive in every state it can be put in by props,
 * the shared composites, then each feature's own components and status maps
 * (contributed by the feature, so its private components stay private).
 * Hover, focus and open overlays are produced by `e2e/pages.shots.ts`.
 */
export function UiGalleryPage() {
  const toggleTheme = useTheme((s) => s.toggle)
  return (
    <div className="min-h-dvh bg-canvas">
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">UI gallery</h1>
            <p className="mt-1 text-sm text-ink-2">
              Every component in every state. Development builds only. <Kbd>⇧</Kbd> <Kbd>D</Kbd> switches
              theme.
            </p>
          </div>
          <Button size="sm" onClick={toggleTheme}>
            <MoonIcon />
            Toggle theme
          </Button>
        </header>
        <GroupHeading id="primitives">Primitives</GroupHeading>
        <ButtonsSection />
        <FieldsSection />
        <ChoiceSection />
        <CalloutSection />
        <OverlaySection />
        <LoadingSection />
        <GroupHeading id="composites">Composites</GroupHeading>
        <CompositesSection />
        <GroupHeading id="domain">Domain</GroupHeading>
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <PaymentsGallery />
          <WebhooksGallery />
          <ApiKeysGallery />
          <MerchantGallery />
        </Suspense>
      </main>
    </div>
  )
}

/** Features hand over their sections as dev-only loaders, so production builds drop them. */
function devSection<K extends string>(load: (() => Promise<Record<K, ComponentType>>) | null, name: K) {
  return lazy(async () => {
    if (!load) throw new Error('Gallery sections exist in development builds only')
    return { default: (await load())[name] }
  })
}

const PaymentsGallery = devSection(paymentsGallery, 'PaymentsGallery')
const WebhooksGallery = devSection(webhooksGallery, 'WebhooksGallery')
const ApiKeysGallery = devSection(apiKeysGallery, 'ApiKeysGallery')
const MerchantGallery = devSection(merchantGallery, 'MerchantGallery')

function GroupHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="pt-4 text-xs font-medium tracking-wide text-ink-3 uppercase first-of-type:pt-0">
      {children}
    </h2>
  )
}

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'danger-outline', 'link'] as const

function ButtonsSection() {
  return (
    <GallerySection
      title="Button"
      description="One primary per view. Hover and keyboard focus: see the focus shots."
    >
      {/* Scrolls sideways on phones instead of letting nowrap buttons overlap. */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="grid min-w-[34rem] grid-cols-[7rem_repeat(3,minmax(0,1fr))] items-center gap-x-4 gap-y-3 text-sm">
          <span />
          {['Default', 'Disabled', 'Loading'].map((h) => (
            <span key={h} className="text-xs text-ink-3">
              {h}
            </span>
          ))}
          {VARIANTS.map((variant) => (
            <ButtonRow key={variant} variant={variant} />
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-start gap-4 border-t border-line pt-4">
        <GalleryState label="sm">
          <Button size="sm">Refund</Button>
        </GalleryState>
        <GalleryState label="md (default)">
          <Button>Refund</Button>
        </GalleryState>
        <GalleryState label="lg">
          <Button size="lg">Refund</Button>
        </GalleryState>
        <GalleryState label="icon">
          <Button size="icon" variant="ghost" aria-label="More actions">
            <DotsThreeIcon />
          </Button>
        </GalleryState>
        <GalleryState label="With icon">
          <Button variant="secondary">
            <PencilSimpleIcon />
            Edit endpoint
          </Button>
        </GalleryState>
      </div>
    </GallerySection>
  )
}

function ButtonRow({ variant }: { variant: (typeof VARIANTS)[number] }) {
  const label = variant === 'link' ? 'View payment' : 'Revoke key'
  return (
    <>
      <span className="font-mono text-xs text-ink-2">{variant}</span>
      <div>
        <Button variant={variant}>{label}</Button>
      </div>
      <div>
        <Button variant={variant} disabled>
          {label}
        </Button>
      </div>
      <div>
        <Button variant={variant} loading>
          {label}
        </Button>
      </div>
    </>
  )
}

function FieldsSection() {
  return (
    <GallerySection
      title="Text fields"
      description="Input, NativeSelect and Textarea share one set of states."
    >
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Empty">
          <Input placeholder="ORDER-1001" />
        </Field>
        <Field label="Filled">
          <Input defaultValue="ORDER-1001" />
        </Field>
        <Field label="With hint" hint="Shown on the customer’s statement.">
          <Input defaultValue="Áo thun basic" />
        </Field>
        <Field label="Invalid" error="Amount must be greater than zero.">
          <Input defaultValue="0" leading="VND" className="num" />
        </Field>
        <Field label="Disabled">
          <Input defaultValue="fp_test_A7x…" disabled className="font-mono" />
        </Field>
        <Field label="Leading text">
          <Input defaultValue="500,000" leading="VND" className="num" />
        </Field>
        <Field label="Select">
          <NativeSelect defaultValue="VND">
            <option>VND</option>
            <option>USD</option>
          </NativeSelect>
        </Field>
        <Field label="Select invalid" error="Choose a currency.">
          <NativeSelect defaultValue="">
            <option value="">Choose…</option>
          </NativeSelect>
        </Field>
        <Field label="Select disabled">
          <NativeSelect defaultValue="VND" disabled>
            <option>VND</option>
          </NativeSelect>
        </Field>
        <Field label="Textarea" hint="Up to 500 characters." className="sm:col-span-2 lg:col-span-3">
          <Textarea defaultValue="Đơn hàng giao trong ngày." />
        </Field>
      </div>
    </GallerySection>
  )
}

function ChoiceSection() {
  const [filter, setFilter] = useState('dead')
  return (
    <GallerySection title="Choice" description="Checkbox and Segmented.">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <CheckboxState label="Unchecked" />
        <CheckboxState label="Checked" checked />
        <CheckboxState label="Invalid" invalid />
        <CheckboxState label="Disabled" disabled />
        <CheckboxState label="Disabled checked" checked disabled />
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <GalleryState label="Segmented">
          <Segmented
            aria-label="Delivery status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: 101 },
              { value: 'dead', label: 'Dead', count: 7 },
              { value: 'retrying', label: 'Retrying', count: 26 },
            ]}
          />
        </GalleryState>
      </div>
    </GallerySection>
  )
}

function CheckboxState({
  label,
  checked,
  invalid,
  disabled,
}: {
  label: string
  checked?: boolean
  invalid?: boolean
  disabled?: boolean
}) {
  const [on, setOn] = useState(Boolean(checked))
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={on}
        onCheckedChange={(v) => setOn(v === true)}
        disabled={disabled}
        aria-invalid={invalid || undefined}
      />
      {label}
    </label>
  )
}

function CalloutSection() {
  return (
    <GallerySection title="Callout" description="A persistent condition of what is on screen.">
      <div className="grid gap-3 lg:grid-cols-2">
        <Callout tone="info" title="Test key connected">
          Payments are read with fp_test_A7x… for this tab only.
        </Callout>
        <Callout tone="success" title="Refund succeeded">
          200,000 VND returns to the customer in 5–10 days.
        </Callout>
        <Callout
          tone="warning"
          title="Provider outcome unknown"
          action={
            <Button size="sm" variant="secondary">
              Check again
            </Button>
          }
        >
          The payment stays Processing. FlowPay will not guess.
        </Callout>
        <Callout tone="danger" title="Endpoint disabled">
          Pending deliveries were marked Dead and will not be retried.
        </Callout>
        <Callout tone="danger">Body only, no title: the request failed (req_01KAR7Q9XW).</Callout>
      </div>
    </GallerySection>
  )
}

function OverlaySection() {
  const [confirming, setConfirming] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  return (
    <GallerySection title="Overlays" description="Dialog, ConfirmDialog, Sheet, Menu, Tooltip.">
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent
            title="New test payment"
            description="Creates a PaymentIntent with your connected test key."
            footer={
              <>
                <Button variant="ghost">Cancel</Button>
                <Button variant="primary">Create payment</Button>
              </>
            }
          >
            <div className="space-y-4">
              <Field label="Amount" error="Not a valid VND amount.">
                <Input defaultValue="12.5" leading="VND" className="num" />
              </Field>
              <Field label="Order ID" hint="Optional. Your reference for this payment.">
                <Input defaultValue="ORDER-1001" />
              </Field>
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="danger-outline" onClick={() => setConfirming(true)}>
          Open confirm
        </Button>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Revoke this key?"
          description="Requests signed with fp_test_A7x… fail immediately. This cannot be undone."
          confirmLabel="Revoke key"
          onConfirm={() => setConfirming(false)}
        />
        <Button onClick={() => setSheetOpen(true)}>Open sheet</Button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen} eyebrow="Webhook delivery" title="wdl_01KAR7Q9XW">
          <div className="space-y-3 p-5 text-sm text-ink-2">
            <p>Record details render here; the list stays visible behind the sheet.</p>
            <Skeleton className="w-2/3" />
            <Skeleton className="w-1/2" />
          </div>
        </Sheet>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="secondary">
              Open menu
              <DotsThreeIcon />
            </Button>
          </MenuTrigger>
          <MenuContent align="start">
            <MenuLabel>Endpoint</MenuLabel>
            <MenuItem>
              <PencilSimpleIcon />
              Edit
            </MenuItem>
            <MenuItem disabled>
              <ProhibitIcon />
              Enable (not supported)
            </MenuItem>
            <MenuSeparator />
            <MenuItem tone="danger">
              <TrashIcon />
              Disable endpoint
            </MenuItem>
          </MenuContent>
        </Menu>
        <Tooltip content="Copies the full ID">
          <Button variant="ghost">Hover for tooltip</Button>
        </Tooltip>
      </div>
    </GallerySection>
  )
}

function LoadingSection() {
  return (
    <GallerySection title="Loading and keys">
      <div className="flex flex-wrap items-center gap-8">
        <GalleryState label="Spinner">
          <Spinner />
        </GalleryState>
        <GalleryState label="Skeleton">
          <div className="w-48 space-y-2">
            <Skeleton className="w-full" />
            <Skeleton className="w-2/3" />
          </div>
        </GalleryState>
        <GalleryState label="Kbd">
          <span className="flex gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </GalleryState>
      </div>
    </GallerySection>
  )
}
