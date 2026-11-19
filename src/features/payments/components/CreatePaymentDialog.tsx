import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Callout } from '@/components/callout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect } from '@/components/ui/input'
import { useFieldError, useFormat, vmsg } from '@/i18n'
import { errorMessage } from '@/lib/api/errors'
import { applyServerErrors } from '@/lib/form'
import { useIdempotencyKey } from '@/lib/idempotency'
import { COMMON_CURRENCIES, currencyDigits, parseToMinor } from '@/lib/money'
import { useCreatePayment } from '../queries'

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

export function CreatePaymentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const createKey = useIdempotencyKey('create')
  const confirmKey = useIdempotencyKey('confirm')
  const mutation = useCreatePayment()

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: freshValues() })
  const currency = useWatch({ control: form.control, name: 'currency' })
  const amount = useWatch({ control: form.control, name: 'amount' })
  const confirmNow = useWatch({ control: form.control, name: 'confirmNow' })
  const fmt = useFormat()
  const fieldError = useFieldError()
  const preview = parseToMinor(amount ?? '', currency ?? 'VND', fmt.locale)

  function close(next: boolean) {
    if (mutation.isPending) return
    onOpenChange(next)
    if (!next) {
      // Closing ends this intent: next open gets new values and new idempotency keys.
      form.reset(freshValues())
      mutation.reset()
      createKey.reset()
      confirmKey.reset()
    }
  }

  function submit(values: Values) {
    const input = {
      amount: parseToMinor(values.amount, values.currency)!,
      currency: values.currency,
      orderId: values.orderId || undefined,
      description: values.description || undefined,
    }
    mutation.mutate(
      {
        input,
        createKey: createKey.keyFor(input),
        confirmKey: values.confirmNow ? confirmKey.keyFor(input) : undefined,
      },
      {
        onSuccess: ({ created, confirmed }) => {
          const payment = created.data
          const amountLabel = `${fmt.money(payment.amount, payment.currency)} ${payment.currency}`
          const replayNote = created.replayed ? ' Replayed: no second payment was created.' : ''
          const view = { label: 'View', onClick: () => navigate(`/payments/${payment.id}`) }

          if (!confirmed)
            toast(`Payment created · ${amountLabel}`, { description: replayNote || undefined, action: view })
          else if (confirmed.status === 202)
            toast.warning('Provider outcome unknown', {
              description: 'The simulator timed out. The payment stays Processing; FlowPay will not guess.',
              action: view,
            })
          else if (confirmed.data.paymentStatus === 'SUCCEEDED')
            toast.success(`Payment succeeded · ${amountLabel}`, {
              description: replayNote || undefined,
              action: view,
            })
          else
            toast.error('Payment declined', {
              description: confirmed.data.failureMessage ?? confirmed.data.failureCode ?? undefined,
              action: view,
            })
          close(false)
        },
        onError: (error) => applyServerErrors(error, form.setError),
      },
    )
  }

  const { errors } = form.formState

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title="New test payment"
        description="Creates a PaymentIntent through the Merchant API with your connected test key."
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="create-payment" loading={mutation.isPending}>
              Create payment
            </Button>
          </>
        }
      >
        <form id="create-payment" className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
          {mutation.isError && <Callout tone="danger">{errorMessage(mutation.error)}</Callout>}

          {/* Two fields, so each control gets its own label, error and description. */}
          <div className="flex items-start gap-2">
            <Field label="Currency" className="w-24 shrink-0">
              <NativeSelect {...form.register('currency')}>
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Amount"
              className="min-w-0 flex-1"
              error={fieldError(errors.amount?.message, {
                currency,
                example: fmt.money(1_234_567, currency),
              })}
              hint={
                preview
                  ? // Show how the input was read, so a misplaced separator is visible before sending.
                    `= ${fmt.moneyWithCode(preview, currency)} · ${fmt.number(preview)} minor units`
                  : 'Amounts are stored as integer minor units.'
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
            label="Order ID"
            hint="Your own reference. Filter payments by it later."
            error={fieldError(errors.orderId?.message)}
          >
            <Input className="font-mono" {...form.register('orderId')} />
          </Field>

          <Field label="Description" error={fieldError(errors.description?.message)}>
            <Input placeholder="Optional" {...form.register('description')} />
          </Field>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line p-3">
            <Checkbox
              checked={confirmNow}
              onCheckedChange={(v) => form.setValue('confirmNow', v === true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium">Confirm immediately</span>
              <span className="mt-0.5 block text-ink-2">
                Sends the payment to the simulator right away. Its outcome comes from the backend setting{' '}
                <code className="font-mono text-xs">PAYMENT_SIMULATOR_DEFAULT_OUTCOME</code>.
              </span>
            </span>
          </label>
        </form>
      </DialogContent>
    </Dialog>
  )
}
