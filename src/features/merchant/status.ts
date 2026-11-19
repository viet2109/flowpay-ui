import type { StatusMap } from '@/components/status-badge'
import type { MerchantStatus } from './api'

export const merchantStatus: StatusMap<MerchantStatus> = {
  ACTIVE: { tone: 'success', label: 'merchant.ACTIVE' },
  SUSPENDED: { tone: 'warning', label: 'merchant.SUSPENDED' },
  CLOSED: { tone: 'neutral', label: 'merchant.CLOSED' },
}
