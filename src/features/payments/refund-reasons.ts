import { useTranslation } from 'react-i18next'

/**
 * Reasons this dashboard offers. The API stores any trimmed text up to 255
 * characters (contract §12); these codes are this dashboard's convention.
 */
export const REFUND_REASONS = [
  'CUSTOMER_REQUEST',
  'DUPLICATE',
  'ORDER_CANCELLED',
  'FRAUDULENT',
  'OTHER',
] as const
export type RefundReasonChoice = (typeof REFUND_REASONS)[number]

/**
 * A refund reason as people should read it: one of the codes above in the UI
 * language, anything else (text from an API client) exactly as stored.
 */
export function useReasonLabel() {
  const { t } = useTranslation('payments')
  return (reason: string | null): string | null => {
    if (!reason) return null
    const known = REFUND_REASONS.find((r) => r === reason)
    return known ? t(`reasons.${known}`) : reason
  }
}
