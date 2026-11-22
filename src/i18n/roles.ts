import { useTranslation } from 'react-i18next'
import { humanize } from '@/lib/format'

/** Backend MerchantRole values with copy; the JWT \`role\` claim carries one of them. */
const ROLES = ['OWNER', 'ADMIN', 'DEVELOPER', 'FINANCE'] as const

/** A role in the UI language; a role this dashboard does not know yet is shown readable. */
export function useRoleLabel() {
  const { t } = useTranslation('common')
  return (role: string): string => {
    const known = ROLES.find((r) => r === role)
    return known ? t(`roles.${known}`) : humanize(role)
  }
}
