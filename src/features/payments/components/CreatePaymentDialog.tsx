import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { z } from '@/lib/zod'
import { Callout } from '@/components/callout'
import { CopyableId } from '@/components/copyable-id'
import { ActionError } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect } from '@/components/ui/input'
import { useFieldError, useFormat, vmsg } from '@/i18n'
import type { HttpResult } from '@/lib/api/http'
import { applyServerErrors } from '@/lib/form'
import { useIdempotencyKey } from '@/lib/idempotency'
import { COMMON_CURRENCIES, currencyDigits, parseToMinor } from '@/lib/money'
import { useConfirmPayment, useCreatePayment } from '../queries'
import type { CreatedPaymentIntent } from '../types'
import { useOutcomeToast } from '../use-outcome-toast'

const schema = z
  .object({
    currency: z.string().length(3, vmsg('currency')),
    amount: z.string().trim().min(1, vmsg('amountRequired')),
    orderId: z
      .string()
      .trim()
      .max(255, vmsg('tooLong', { max: 255 })),
    description: z
      .string()
      .trim()
      .max(500, vmsg('tooLong', { max: 500 })),
    confirmNow: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const minor = parseToMinor(v.amount, v.currency)
    if (minor === null) ctx.addIssue({ code: 'custom', path: ['amount'], message: vmsg('amountInvalid') })
    else if (minor <= 0) ctx.addIssue({ code: 'custom', path: ['amount'], message: vmsg('amountPositive') })
  })

type Values = z.infer<typeof schema>

function defaultOrderId() {
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `ORDER-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

const freshValues = (): Values => ({
  currency: 'VND',
  amount: '',
  orderId: defaultOrderId(),
  description: '',
  confirmNow: true,
})

/**
 * Create, then (optionally) confirm, as two requests with their own idempotency
 * keys. Once the payment exists the form is locked: changing a value then would be
 * a new intent with a new key, that is a second payment. If confirming fails, the
 * dialog says the payment exists and offers to confirm it again with the same key.
 */
export function CreatePaymentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('payments')
  const navigate = useNavigate()
  const outcome = useOutcomeToast()
  const createKey = useIdempotencyKey('create')
  const confirmKey = useIdempotencyKey('confirm')
  const create = useCreatePayment()
  const confirm = useConfirmPayment()
  // The created payment, once the create request succeeded (the dialog may stay open
  // if confirming it then fails).
  const [created, setCreated] = useState<HttpResult<CreatedPaymentIntent> | null>(null)

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: freshValues() })
  const currency = useWatch({ control: form.control, name: 'currency' })
  const amount = useWatch({ control: form.control, name: 'amount' })
  const confirmNow = useWatch({ control: form.control, name: 'confirmNow' })
  const fmt = useFormat()
  const fieldError = useFieldError()
  const preview = parseToMinor(amount ?? '', currency ?? 'VND', fmt.locale)
  const busy = create.isPending || confirm.isPending

  function close(next: boolean) {
    if (busy) return
    onOpenChange(next)
    if (!next) {
      // Closing ends this intent: next open gets new values and new idempotency keys.
      form.reset(freshValues())
      create.reset()
      confirm.reset()
      createKey.reset()
      confirmKey.reset()
      setCreated(null)
    }
  }

  const viewOf = (id: string) => () => navigate(`/payments/${id}`)

  function runConfirm(result: HttpResult<CreatedPaymentIntent>) {
    const payment = result.data
    confirm.mutate(
      // Keyed by the payment: retrying this confirmation always reuses the key.
      { paymentId: payment.id, idempotencyKey: confirmKey.keyFor(payment.id) },
      {
        onSuccess: (confirmed) => {
          outcome.confirmed(confirmed, payment, viewOf(payment.id))
          close(false)
        },
      },
    )
  }

  function submit(values: Values) {
    const input = {
      amount: parseToMinor(values.amount, values.currency)!,
      currency: values.currency,
      orderId: values.orderId || undefined,
      description: values.description || undefined,
    }
    create.mutate(
      { input, idempotencyKey: createKey.keyFor(input) },
      {
        onSuccess: (result) => {
          setCreated(result)
          if (values.confirmNow) runConfirm(result)
          else {
            outcome.created(result, viewOf(result.data.id))
            close(false)
          }
        },
        onError: (error) => applyServerErrors(error, form.setError),
      },
    )
  }

  const { errors } = form.formState
  const confirmFailed = created !== null && confirm.isError

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title={t('create.title')}
        description={t('create.description')}
        footer={
          confirmFailed ? (
            <>
              <Button variant="ghost" onClick={() => close(false)}>
                {t('create.close')}
              </Button>
              <Button
                onClick={() => {
                  close(false)
                  viewOf(created.data.id)()
                }}
              >
                {t('create.view')}
              </Button>
              <Button variant="primary" onClick={() => runConfirm(created)} loading={confirm.isPending}>
                {t('create.retryConfirm')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
                {t('create.cancel')}
              </Button>
              <Button variant="primary" type="submit" form="create-payment" loading={busy}>
                {t('create.submit')}
              </Button>
            </>
          )
        }
      >
        {confirmFailed ? (
          <div className="space-y-3">
            <Callout tone="warning" title={t('create.partialTitle')}>
              <Trans
                t={t}
                i18nKey="create.partialBody"
                components={{ id: <CopyableId value={created.data.id} truncate={false} /> }}
              />
            </Callout>
            <ActionError error={confirm.error} />
          </div>
        ) : (
          <form id="create-payment" className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
            {/* Failures that are not about a field (network, conflicts), with their requestId. */}
            {create.isError && Object.keys(errors).length === 0 && <ActionError error={create.error} />}

            {/* Two fields, so each control gets its own label, error and description. */}
            <fieldset disabled={busy} className="space-y-4">
              <div className="flex items-start gap-2">
                <Field label={t('create.currency')} className="w-24 shrink-0">
                  <NativeSelect {...form.register('currency')}>
                    {COMMON_CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field
                  label={t('create.amount')}
                  className="min-w-0 flex-1"
                  error={fieldError(errors.amount?.message, {
                    currency,
                    example: fmt.money(1_234_567, currency),
                  })}
                  hint={
                    preview
                      ? // Show how the input was read, so a misplaced separator is visible before sending.
                        t('create.amountPreview', {
                          amount: fmt.moneyWithCode(preview, currency),
                          minor: fmt.number(preview),
                        })
                      : t('create.amountHint')
                  }
                >
                  <Input
                    inputMode="decimal"
                    autoFocus
                    placeholder={fmt.money(currencyDigits(currency) === 0 ? 500_000 : 12_500, currency)}
                    className="num"
                    {...form.register('amount')}
                  />
                </Field>
              </div>

              <Field
                label={t('create.orderId')}
                hint={t('create.orderIdHint')}
                error={fieldError(errors.orderId?.message)}
              >
                <Input className="font-mono" {...form.register('orderId')} />
              </Field>

              <Field label={t('create.descriptionLabel')} error={fieldError(errors.description?.message)}>
                <Input placeholder={t('create.descriptionPlaceholder')} {...form.register('description')} />
              </Field>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line p-3">
                <Checkbox
                  checked={confirmNow}
                  onCheckedChange={(v) => form.setValue('confirmNow', v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium">{t('create.confirmNow')}</span>
                  <span className="mt-0.5 block text-ink-2">
                    <Trans
                      t={t}
                      i18nKey="create.confirmNowHint"
                      components={{ code: <code className="font-mono text-xs" /> }}
                    />
                  </span>
                </span>
              </label>
            </fieldset>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
