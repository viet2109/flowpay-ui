import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useFormat } from '@/i18n'
import type { HttpResult } from '@/lib/api/http'
import type { ConfirmResult, CreatedPaymentIntent, Refund } from './types'

type Money = Pick<CreatedPaymentIntent, 'amount' | 'currency'>

/**
 * One wording for payment results, wherever they happen (create dialog, detail
 * page). A FAILED payment is "failed", never "declined": a technical failure ends
 * FAILED too, and the failure code says which. A replay (Idempotency-Replayed)
 * says that nothing new happened.
 */
export function useOutcomeToast() {
  const { t } = useTranslation('payments')
  const fmt = useFormat()
  const amountOf = (p: Money) => fmt.moneyWithCode(p.amount, p.currency)

  return {
    created(result: HttpResult<CreatedPaymentIntent>, view?: () => void) {
      toast(t('outcome.created', { amount: amountOf(result.data) }), {
        description: result.replayed ? t('outcome.createReplayed') : undefined,
        action: view && { label: t('outcome.view'), onClick: view },
      })
    },
    /** 200 with SUCCEEDED or FAILED, or 202 when the provider outcome is unknown (contract §11). */
    confirmed(result: HttpResult<ConfirmResult>, payment: Money, view?: () => void) {
      const action = view && { label: t('outcome.view'), onClick: view }
      const replayNote = result.replayed ? t('outcome.confirmReplayed') : undefined
      if (result.status === 202) {
        toast.warning(t('outcome.unknown'), {
          description: replayNote ?? t('outcome.unknownBody'),
          action,
        })
      } else if (result.data.paymentStatus === 'SUCCEEDED') {
        toast.success(t('outcome.succeeded', { amount: amountOf(payment) }), {
          description: replayNote,
          action,
        })
      } else {
        const reason = [result.data.failureCode, result.data.failureMessage].filter(Boolean).join(' · ')
        toast.error(t('outcome.failed', { amount: amountOf(payment) }), {
          description: [reason, replayNote].filter(Boolean).join(' — ') || undefined,
          action,
        })
      }
    },
    /** 201 with SUCCEEDED or FAILED, or 202 with PROCESSING when the outcome is unknown (contract §12). */
    refunded(result: HttpResult<Refund>) {
      const refund = result.data
      const replayNote = result.replayed ? t('outcome.refundReplayed') : undefined
      if (refund.status === 'SUCCEEDED') {
        toast.success(t('outcome.refunded', { amount: amountOf(refund) }), { description: replayNote })
      } else if (refund.status === 'PROCESSING') {
        toast.warning(t('outcome.refundUnknown'), {
          description: replayNote ?? t('outcome.refundUnknownBody'),
        })
      } else {
        const reason = [refund.failureCode, refund.failureMessage].filter(Boolean).join(' · ')
        toast.error(t('outcome.refundFailed', { amount: amountOf(refund) }), {
          description: [reason, replayNote].filter(Boolean).join(' — ') || undefined,
        })
      }
    },
  }
}
