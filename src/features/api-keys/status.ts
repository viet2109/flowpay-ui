import type { StatusMap } from '@/components/status-badge'
import type { ApiKeyStatus } from './api'

export const keyStatus: StatusMap<ApiKeyStatus> = {
  ACTIVE: { tone: 'success', label: 'apiKey.ACTIVE' },
  REVOKED: { tone: 'neutral', label: 'apiKey.REVOKED' },
}
