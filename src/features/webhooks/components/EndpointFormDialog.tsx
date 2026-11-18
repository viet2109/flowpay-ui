import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Callout } from '@/components/callout'
import { SecretReveal } from '@/components/secret-reveal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/api/errors'
import { applyServerErrors } from '@/lib/form'
import { useCreateEndpoint, useUpdateEndpoint } from '../queries'
import { EVENT_TYPES, type CreatedEndpoint, type EventType, type WebhookEndpoint } from '../types'
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

/**
 * Client checks catch typos early; the backend's URL policy (private, local and
 * metadata addresses) is authoritative and answers with VALIDATION_ERROR.
 */
function urlProblem(url: string): string | undefined {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'Use an https:// URL.'
    if (u.hash) return 'Remove the #fragment.'
    if (u.username || u.password) return 'Credentials in the URL are not allowed.'
  } catch {
    return 'This is not a valid URL.'
  }
  return undefined
}

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Enter the URL that will receive events.')
    .superRefine((url, ctx) => {
      const problem = url ? urlProblem(url) : undefined
      if (problem) ctx.addIssue({ code: 'custom', message: problem })
    }),
  events: z.array(z.enum(EVENT_TYPES)).min(1, 'Choose at least one event.'),
})

type Values = z.infer<typeof schema>

const valuesFor = (endpoint?: WebhookEndpoint): Values => ({
  url: endpoint?.url ?? '',
  events: endpoint?.events ?? DEFAULT_EVENTS,
})

const sameEvents = (a: EventType[], b: EventType[]) => [...a].sort().join() === [...b].sort().join()

export function EndpointFormDialog({ open, onOpenChange, endpoint }: Props) {
  const navigate = useNavigate()
  const [created, setCreated] = useState<CreatedEndpoint | null>(null)
  const create = useCreateEndpoint()
  const update = useUpdateEndpoint(endpoint?.id ?? '')
  const mutation = endpoint ? update : create

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesFor(endpoint) })
  const events = useWatch({ control: form.control, name: 'events' })
  const { errors } = form.formState

  function close() {
    onOpenChange(false)
    if (created) navigate(`/developers/webhooks/${created.id}`)
    form.reset(valuesFor(endpoint))
    setCreated(null)
    mutation.reset()
  }

  function submit(values: Values) {
    const onError = (error: unknown) => applyServerErrors(error, form.setError)
    if (!endpoint) {
      create.mutate(values, { onSuccess: setCreated, onError })
      return
    }
    // PATCH only what changed; an untouched form just closes.
    const patch: { url?: string; events?: EventType[] } = {}
    if (values.url !== endpoint.url) patch.url = values.url
    if (!sameEvents(values.events, endpoint.events)) patch.events = values.events
    if (!patch.url && !patch.events) return close()
    update.mutate(patch, {
      onSuccess: () => {
        toast.success('Endpoint updated')
        close()
      },
      onError,
    })
  }

  // Field-level server errors are shown on their field; anything else (including
  // URL-policy rejections without `errors[]`, F10) goes in the callout.
  const showCallout = mutation.isError && !errors.url && !errors.events

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
          title={endpoint ? 'Edit endpoint' : 'Add webhook endpoint'}
          description="FlowPay POSTs signed JSON to this URL. Delivery is at-least-once: deduplicate by FlowPay-Event-Id."
          footer={
            <>
              <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="endpoint-form" loading={mutation.isPending}>
                {endpoint ? 'Save changes' : 'Add endpoint'}
              </Button>
            </>
          }
        >
          <form id="endpoint-form" onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
            {showCallout && <Callout tone="danger">{errorMessage(mutation.error)}</Callout>}
            <Field
              label="Endpoint URL"
              hint="HTTPS required in production. Private, local and metadata addresses are rejected."
              error={errors.url?.message}
            >
              <Input
                {...form.register('url')}
                placeholder="https://example.com/webhooks/flowpay"
                className="font-mono"
                autoFocus
                spellCheck={false}
              />
            </Field>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Events</span>
                <span className="num text-xs text-ink-3">
                  {events.length} of {EVENT_TYPES.length} selected
                </span>
              </div>
              <Controller
                control={form.control}
                name="events"
                render={({ field, fieldState }) => (
                  <EventPicker value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
                )}
              />
              {errors.events && <p className="text-xs text-danger">{errors.events.message}</p>}
            </div>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
