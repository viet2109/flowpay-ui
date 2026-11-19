import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Callout } from '@/components/callout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect } from '@/components/ui/input'
import { useErrorMessage, useFieldError, useFormat, vmsg } from '@/i18n'
import { cn } from '@/lib/cn'
import { useIdempotencyKey } from '@/lib/idempotency'
import { minorToInput, parseToMinor } from '@/lib/money'
import { useCreateRefund } from '../queries'
import type { PaymentIntent } from '../types'

const REASONS = [
  { value: 'CUSTOMER_REQUEST', label: 'Customer request' },
  { value: 'DUPLICATE', label: 'Duplicate charge' },
  { value: 'ORDER_CANCELLED', label: 'Order cancelled' },
  { value: 'FRAUDULENT', label: 'Suspected fraud' },
  { value: 'OTHER', label: 'Other…' },
]

interface Props {
  payment: PaymentIntent
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RefundDialog({ payment, open, onOpenChange }: Props) {
  const errorMessage = useErrorMessage()
  const { currency, refundableAmount } = payment
  const fmt = useFormat()
  const fieldError = useFieldError()
  const [amountText, setAmountText] = useState(() => minorToInput(refundableAmount, currency))
  const [reason, setReason] = useState('CUSTOMER_REQUEST')
  const [otherReason, setOtherReason] = useState('')
  const [touched, setTouched] = useState(false)
  const idempotency = useIdempotencyKey('refund')
  const mutation = useCreateRefund(payment.id)

  const amount = parseToMinor(amountText, currency)
  const amountError =
    amount === null
      ? vmsg('amountInvalid')
      : amount <= 0
        ? vmsg('amountPositive')
        : amount > refundableAmount
          ? vmsg('amountAboveRefundable')
          : undefined
  const remaining = amount !== null && !amountError ? refundableAmount - amount : null

  function close(next: boolean) {
    if (mutation.isPending) return
    onOpenChange(next)
    if (!next) {
      setAmountText(minorToInput(refundableAmount, currency))
      setReason('CUSTOMER_REQUEST')
      setOtherReason('')
      setTouched(false)
      mutation.reset()
      idempotency.reset()
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (amountError || amount === null) return
    const input = { amount, reason: reason === 'OTHER' ? otherReason.trim() || undefined : reason }
    mutation.mutate(
      { input, idempotencyKey: idempotency.keyFor(input) },
      {
        onSuccess: (result) => {
          const refund = result.data
          const label = `${fmt.money(refund.amount, refund.currency)} ${refund.currency}`
          if (refund.status === 'SUCCEEDED') toast.success(`Refunded ${label}`)
          else if (refund.status === 'PROCESSING')
            toast.warning('Refund outcome unknown', {
              description:
                'The provider did not answer. The amount stays reserved until the outcome is known.',
            })
          else
            toast.error('Refund failed', {
              description: refund.failureMessage ?? refund.failureCode ?? undefined,
            })
          close(false)
        },
      },
    )
  }

  const quick = [
    { label: 'Full', value: refundableAmount },
    { label: 'Half', value: Math.floor(refundableAmount / 2) },
  ].filter((q) => q.value > 0)

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title="Refund payment"
        description={
          <>
            Up to{' '}
            <strong className="num font-medium text-ink">
              {fmt.money(refundableAmount, currency)} {currency}
            </strong>{' '}
            is refundable. Multiple partial refunds are allowed.
          </>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="refund-form" loading={mutation.isPending}>
              Refund {amount && !amountError ? `${fmt.money(amount, currency)} ${currency}` : ''}
            </Button>
          </>
        }
      >
        <form id="refund-form" onSubmit={submit} className="space-y-4" noValidate>
          {mutation.isError && <Callout tone="danger">{errorMessage(mutation.error)}</Callout>}

          <Field
            label="Amount"
            error={
              touched
                ? fieldError(amountError, {
                    currency,
                    example: fmt.money(1_234_567, currency),
                    amount: fmt.money(refundableAmount, currency),
                  })
                : undefined
            }
            aside={
              <div className="flex gap-1">
                {quick.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setAmountText(minorToInput(q.value, currency))}
                    className={cn(
                      'rounded-sm px-1.5 text-xs text-ink-3 hover:bg-surface-hover hover:text-ink',
                      amount === q.value && 'bg-surface-sunken text-ink',
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            }
            hint={
              remaining !== null ? (
                <span className="num">
                  {fmt.money(remaining, currency)} {currency} will remain refundable
                </span>
              ) : undefined
            }
          >
            <Input
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              onBlur={() => setTouched(true)}
              inputMode="decimal"
              className="num"
              leading={<span className="font-mono text-xs">{currency}</span>}
              autoFocus
            />
          </Field>

          <Field label="Reason" hint="Stored with the refund and visible in its history.">
            <NativeSelect value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {reason === 'OTHER' && (
            <Field
              label="Describe the reason"
              aside={<span className="text-xs text-ink-3">{otherReason.length}/255</span>}
            >
              <Input value={otherReason} maxLength={255} onChange={(e) => setOtherReason(e.target.value)} />
            </Field>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
