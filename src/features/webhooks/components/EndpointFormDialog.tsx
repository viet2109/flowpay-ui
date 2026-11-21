import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Callout } from '@/components/callout'
import { SecretReveal } from '@/components/secret-reveal'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useErrorMessage, useFieldError, vmsg } from '@/i18n'
import { isApiError } from '@/lib/api/errors'
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
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return vmsg('urlScheme')
    if (u.hash) return vmsg('urlFragment')
    if (u.username || u.password) return vmsg('urlCredentials')
  } catch {
    return vmsg('urlInvalid')
  }
  return undefined
}

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(1, vmsg('urlRequired'))
    .superRefine((url, ctx) => {
      const problem = url ? urlProblem(url) : undefined
      if (problem) ctx.addIssue({ code: 'custom', message: problem })
    }),
  events: z.array(z.enum(EVENT_TYPES)).min(1, vmsg('eventsRequired')),
})

type Values = z.infer<typeof schema>

const valuesFor = (endpoint?: WebhookEndpoint): Values => ({
  url: endpoint?.url ?? '',
  events: endpoint?.events ?? DEFAULT_EVENTS,
})

const sameEvents = (a: EventType[], b: EventType[]) => [...a].sort().join() === [...b].sort().join()

export function EndpointFormDialog({ open, onOpenChange, endpoint }: Props) {
  const { t } = useTranslation('webhooks')
  const { t: tc } = useTranslation('common')
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const [created, setCreated] = useState<CreatedEndpoint | null>(null)
  const create = useCreateEndpoint()
  const update = useUpdateEndpoint(endpoint?.id ?? '')
  const mutation = endpoint ? update : create

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesFor(endpoint) })
  const events = useWatch({ control: form.control, name: 'events' })
  const { errors } = form.formState
  const fieldError = useFieldError()

  function close() {
    onOpenChange(false)
    if (created) navigate(`/developers/webhooks/${created.id}`)
    form.reset(valuesFor(endpoint))
    setCreated(null)
    mutation.reset()
  }

  /**
   * Field violations land on their field. The backend's URL policy answers with a
   * VALIDATION_ERROR that has no field list (finding F10); this form only sends
   * known, unique events and never an empty patch, so when the request carried a
   * URL, that rejection is about the URL and is shown on it.
   */
  function serverError(error: unknown, sentUrl: boolean) {
    if (applyServerErrors(error, form.setError)) return
    if (sentUrl && isApiError(error, 'VALIDATION_ERROR')) {
      form.setError('url', { type: 'server', message: vmsg('urlRejected') })
    }
  }

  function submit(values: Values) {
    if (!endpoint) {
      create.mutate(values, { onSuccess: setCreated, onError: (error) => serverError(error, true) })
      return
    }
    // PATCH only what changed; an untouched form just closes.
    const patch: { url?: string; events?: EventType[] } = {}
    if (values.url !== endpoint.url) patch.url = values.url
    if (!sameEvents(values.events, endpoint.events)) patch.events = values.events
    if (!patch.url && !patch.events) return close()
    update.mutate(patch, {
      onSuccess: () => {
        toast.success(t('form.updated'))
        close()
      },
      onError: (error) => serverError(error, patch.url !== undefined),
    })
  }

  // Anything not shown on a field (conflicts, network, rate limits) goes in the callout.
  const showCallout = mutation.isError && !errors.url && !errors.events

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !mutation.isPending && close()}>
      {created ? (
        <DialogContent
          title={t('form.createdTitle')}
          description={t('form.createdDescription')}
          onInteractOutside={(e) => e.preventDefault()}
          footer={
            <Button variant="primary" onClick={close}>
              {t('form.stored')}
            </Button>
          }
        >
          <SecretReveal label={t('form.secretLabel')} secret={created.secret} />
        </DialogContent>
      ) : (
        <DialogContent
          width="lg"
          title={endpoint ? t('form.editTitle') : t('form.addTitle')}
          description={t('form.description')}
          footer={
            <>
              <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
                {tc('cancel')}
              </Button>
              <Button variant="primary" type="submit" form="endpoint-form" loading={mutation.isPending}>
                {endpoint ? t('form.save') : t('form.add')}
              </Button>
            </>
          }
        >
          <form id="endpoint-form" onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
            {showCallout && <Callout tone="danger">{errorMessage(mutation.error)}</Callout>}
            <Field label={t('form.url')} hint={t('form.urlHint')} error={fieldError(errors.url?.message)}>
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
                <span className="text-sm font-medium">{t('form.events')}</span>
                <span className="num text-xs text-ink-3">
                  {t('form.selected', { count: events.length, total: EVENT_TYPES.length })}
                </span>
              </div>
              <Controller
                control={form.control}
                name="events"
                render={({ field, fieldState }) => (
                  <EventPicker value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
                )}
              />
              {errors.events && <p className="text-xs text-danger">{fieldError(errors.events.message)}</p>}
            </div>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
