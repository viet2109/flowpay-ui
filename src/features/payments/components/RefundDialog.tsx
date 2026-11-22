import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ActionError } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect } from '@/components/ui/input'
import { useFieldError, useFormat, vmsg } from '@/i18n'
import { cn } from '@/lib/cn'
import { useIdempotencyKey } from '@/lib/idempotency'
import { minorToInput, parseToMinor } from '@/lib/money'
import { useCreateRefund } from '../queries'
import { REFUND_REASONS, type RefundReasonChoice } from '../refund-reasons'
import type { PaymentIntent } from '../types'
import { useOutcomeToast } from '../use-outcome-toast'

const REASON_MAX = 255

interface Props {
  payment: PaymentIntent
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * One open of this dialog is one refund intent: sending the same values again
 * (double click, retry after a timeout) reuses the idempotency key, so nothing is
 * refunded twice. Closing the dialog ends the intent, so a second identical refund
 * made on purpose gets its own key instead of replaying the first.
 */
export function RefundDialog({ payment, open, onOpenChange }: Props) {
  const { t } = useTranslation('payments')
  const { currency, refundableAmount } = payment
  const fmt = useFormat()
  const fieldError = useFieldError()
  const outcome = useOutcomeToast()
  const [amountText, setAmountText] = useState(() => minorToInput(refundableAmount, currency))
  const [reason, setReason] = useState<RefundReasonChoice>('CUSTOMER_REQUEST')
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
          outcome.refunded(result)
          close(false)
        },
      },
    )
  }

  const money = (minor: number) => fmt.moneyWithCode(minor, currency)
  const quick = [
    { label: t('refund.full'), value: refundableAmount },
    { label: t('refund.half'), value: Math.floor(refundableAmount / 2) },
  ].filter((q) => q.value > 0)

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title={t('refund.title')}
        description={
          <Trans
            t={t}
            i18nKey="refund.description"
            components={{
              amount: <strong className="num font-medium text-ink">{money(refundableAmount)}</strong>,
            }}
          />
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)} disabled={mutation.isPending}>
              {t('refund.cancel')}
            </Button>
            <Button variant="primary" type="submit" form="refund-form" loading={mutation.isPending}>
              {amount && !amountError
                ? t('refund.submit', { amount: money(amount) })
                : t('refund.submitEmpty')}
            </Button>
          </>
        }
      >
        <form id="refund-form" onSubmit={submit} className="space-y-4" noValidate>
          {/* Server refusals (capacity taken by another refund, conflicts), with their requestId. */}
          {mutation.isError && <ActionError error={mutation.error} />}

          <Field
            label={t('refund.amount')}
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
                <span className="num">{t('refund.remaining', { amount: money(remaining) })}</span>
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

          <Field label={t('refund.reason')} hint={t('refund.reasonHint')}>
            <NativeSelect value={reason} onChange={(e) => setReason(e.target.value as RefundReasonChoice)}>
              {REFUND_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`reasons.${r}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {reason === 'OTHER' && (
            <Field
              label={t('refund.otherReason')}
              aside={
                <span className="num text-xs text-ink-3">
                  {otherReason.length}/{REASON_MAX}
                </span>
              }
            >
              <Input
                value={otherReason}
                maxLength={REASON_MAX}
                placeholder={t('refund.otherPlaceholder')}
                onChange={(e) => setOtherReason(e.target.value)}
              />
            </Field>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
