import type { StatusMap } from '@/components/status-badge'
import type { MerchantStatus } from './api'

export const merchantStatus: StatusMap<MerchantStatus> = {
  ACTIVE: { tone: 'success', label: 'Active' },
  SUSPENDED: { tone: 'warning', label: 'Suspended' },
  CLOSED: { tone: 'neutral', label: 'Closed' },
}
