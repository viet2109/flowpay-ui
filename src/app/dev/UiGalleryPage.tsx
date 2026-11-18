import { DotsThreeIcon, MoonIcon, PencilSimpleIcon, ProhibitIcon, TrashIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Callout } from '@/components/callout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Segmented } from '@/components/ui/segmented'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip } from '@/components/ui/tooltip'
import { useTheme } from '@/lib/theme'

/**
 * Dev-only catalogue of every primitive in every state it can be put in by
 * props. Hover, focus and open overlays are produced by `e2e/pages.shots.ts`.
 * Composites (Money, StatusBadge, LifecycleRail…) are added in P1-T03.
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
              Primitives in every state. Development builds only. <Kbd>⇧</Kbd> <Kbd>D</Kbd> switches theme.
            </p>
          </div>
          <Button size="sm" onClick={toggleTheme}>
            <MoonIcon />
            Toggle theme
          </Button>
        </header>
        <ButtonsSection />
        <FieldsSection />
        <ChoiceSection />
        <CalloutSection />
        <OverlaySection />
        <LoadingSection />
      </main>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Panel aria-label={title}>
      <PanelHeader title={title} description={description} />
      <div className="p-4">{children}</div>
    </Panel>
  )
}

/** One labelled cell: the state name above the element in that state. */
function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <span className="text-xs text-ink-3">{label}</span>
      {children}
    </div>
  )
}

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'danger-outline', 'link'] as const

function ButtonsSection() {
  return (
    <Section
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
        <State label="sm">
          <Button size="sm">Refund</Button>
        </State>
        <State label="md (default)">
          <Button>Refund</Button>
        </State>
        <State label="lg">
          <Button size="lg">Refund</Button>
        </State>
        <State label="icon">
          <Button size="icon" variant="ghost" aria-label="More actions">
            <DotsThreeIcon />
          </Button>
        </State>
        <State label="With icon">
          <Button variant="secondary">
            <PencilSimpleIcon />
            Edit endpoint
          </Button>
        </State>
      </div>
    </Section>
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
    <Section title="Text fields" description="Input, NativeSelect and Textarea share one set of states.">
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
    </Section>
  )
}

function ChoiceSection() {
  const [filter, setFilter] = useState('dead')
  return (
    <Section title="Choice" description="Checkbox and Segmented.">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <CheckboxState label="Unchecked" />
        <CheckboxState label="Checked" checked />
        <CheckboxState label="Invalid" invalid />
        <CheckboxState label="Disabled" disabled />
        <CheckboxState label="Disabled checked" checked disabled />
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <State label="Segmented">
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
        </State>
      </div>
    </Section>
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
    <Section title="Callout" description="A persistent condition of what is on screen.">
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
    </Section>
  )
}

function OverlaySection() {
  const [confirming, setConfirming] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  return (
    <Section title="Overlays" description="Dialog, ConfirmDialog, Sheet, Menu, Tooltip.">
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
    </Section>
  )
}

function LoadingSection() {
  return (
    <Section title="Loading and keys">
      <div className="flex flex-wrap items-center gap-8">
        <State label="Spinner">
          <Spinner />
        </State>
        <State label="Skeleton">
          <div className="w-48 space-y-2">
            <Skeleton className="w-full" />
            <Skeleton className="w-2/3" />
          </div>
        </State>
        <State label="Kbd">
          <span className="flex gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </State>
      </div>
    </Section>
  )
}
