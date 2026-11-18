import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Callout } from '@/components/callout'
import { SecretReveal } from '@/components/secret-reveal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage, isApiError } from '@/lib/api/errors'
import { useCreateEndpoint, useUpdateEndpoint } from '../queries'
import type { CreatedEndpoint, EventType, WebhookEndpoint } from '../types'
import { EventPicker } from './EventPicker'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When given, the dialog edits this endpoint instead of creating one. */
  endpoint?: WebhookEndpoint
}

const DEFAULT_EVENTS: EventType[] = [
  'payment.succeeded',
  'payment.failed',
  'refund.succeeded',
  'refund.failed',
]

function validateUrl(url: string): string | undefined {
  if (!url.trim()) return 'Enter the URL that will receive events.'
  try {
    const u = new URL(url.trim())
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'Use an https:// URL.'
    if (u.hash) return 'Remove the #fragment.'
    if (u.username || u.password) return 'Credentials in the URL are not allowed.'
  } catch {
    return 'This is not a valid URL.'
  }
  return undefined
}

export function EndpointFormDialog({ open, onOpenChange, endpoint }: Props) {
  const navigate = useNavigate()
  const isEdit = Boolean(endpoint)
  const [url, setUrl] = useState(endpoint?.url ?? '')
  const [events, setEvents] = useState<EventType[]>(endpoint?.events ?? DEFAULT_EVENTS)
  const [submitted, setSubmitted] = useState(false)
  const [created, setCreated] = useState<CreatedEndpoint | null>(null)
  const create = useCreateEndpoint()
  const update = useUpdateEndpoint(endpoint?.id ?? '')
  const mutation = isEdit ? update : create

  const urlError = validateUrl(url)
  const eventsError = events.length === 0 ? 'Choose at least one event.' : undefined
  const serverUrlError = isApiError(mutation.error, 'VALIDATION_ERROR')
    ? mutation.error.fieldErrors.find((f) => f.field === 'url')?.message
    : undefined

  function close() {
    onOpenChange(false)
    if (created) navigate(`/developers/webhooks/${created.id}`)
    setUrl(endpoint?.url ?? '')
    setEvents(endpoint?.events ?? DEFAULT_EVENTS)
    setSubmitted(false)
    setCreated(null)
    mutation.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (urlError || eventsError) return

    if (endpoint) {
      const patch: { url?: string; events?: EventType[] } = {}
      if (url.trim() !== endpoint.url) patch.url = url.trim()
      if ([...events].sort().join() !== [...endpoint.events].sort().join()) patch.events = events
      if (!patch.url && !patch.events) return close()
      update.mutate(patch, {
        onSuccess: () => {
          toast.success('Endpoint updated')
          close()
        },
      })
    } else {
      create.mutate({ url: url.trim(), events }, { onSuccess: setCreated })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !mutation.isPending && close()}>
      {created ? (
        <DialogContent
          title="Endpoint created"
          description="Use this secret to verify the FlowPay-Signature header on every request."
          onInteractOutside={(e) => e.preventDefault()}
          footer={
            <Button variant="primary" onClick={close}>
              I’ve stored it
            </Button>
          }
        >
          <SecretReveal label="Signing secret" secret={created.secret} />
        </DialogContent>
      ) : (
        <DialogContent
          width="lg"
          title={isEdit ? 'Edit endpoint' : 'Add webhook endpoint'}
          description="FlowPay POSTs signed JSON to this URL. Delivery is at-least-once: deduplicate by FlowPay-Event-Id."
          footer={
            <>
              <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="endpoint-form" loading={mutation.isPending}>
                {isEdit ? 'Save changes' : 'Add endpoint'}
              </Button>
            </>
          }
        >
          <form id="endpoint-form" onSubmit={submit} className="space-y-5" noValidate>
            {mutation.isError && !serverUrlError && (
              <Callout tone="danger">{errorMessage(mutation.error)}</Callout>
            )}
            <Field
              label="Endpoint URL"
              hint="HTTPS required in production. Private, local and metadata addresses are rejected."
              error={(submitted ? urlError : undefined) ?? serverUrlError}
            >
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks/flowpay"
                className="font-mono"
                autoFocus
                spellCheck={false}
              />
            </Field>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Events</span>
                <span className="num text-xs text-ink-3">{events.length} of 6 selected</span>
              </div>
              <EventPicker value={events} onChange={setEvents} invalid={submitted && Boolean(eventsError)} />
              {submitted && eventsError && <p className="text-xs text-danger">{eventsError}</p>}
            </div>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
