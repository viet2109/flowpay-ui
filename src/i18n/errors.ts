import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/lib/api/errors'

/**
 * Message for a failed request, in the UI language. Branches on the stable
 * `code`; codes without copy show the server's own message, and anything that
 * is not an API error gets a generic line.
 */
export function useErrorMessage() {
  const { t, i18n } = useTranslation('errors')
  return (error: unknown): string => {
    if (error instanceof ApiError && error.code === 'RATE_LIMIT_EXCEEDED' && error.retryAfter)
      return t('rateLimitedFor', { count: error.retryAfter })
    if (error instanceof ApiError)
      return i18n.exists(error.code, { ns: 'errors' }) ? t(error.code as ParseKeys<'errors'>) : error.message
    return t('unexpected')
  }
}
