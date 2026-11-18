import { ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { ConnectKeyPanel, useTestKey } from '@/features/test-mode'
import { isApiError } from '@/lib/api/errors'

/**
 * Error display for Merchant API queries. A revoked/invalid test key is not a
 * "try again" situation, so it offers to connect another key instead.
 */
export function MerchantApiError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const disconnect = useTestKey((s) => s.disconnect)

  if (isApiError(error, 'SANDBOX_KEY_MISSING')) return <ConnectKeyPanel className="my-6" />

  if (isApiError(error, 'INVALID_API_KEY') || isApiError(error, 'API_KEY_REVOKED')) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <p className="text-sm font-medium">The connected test key no longer works</p>
        <p className="mt-1 max-w-sm text-sm text-ink-2">
          It may have been revoked. Connect an active key to keep working with payments.
        </p>
        <Button size="sm" className="mt-4" onClick={disconnect}>
          Connect a different key
        </Button>
      </div>
    )
  }

  return <ErrorState error={error} onRetry={onRetry} />
}
