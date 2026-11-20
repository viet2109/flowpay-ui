import { refreshSession, sessionSnapshot, useSession } from '@/features/auth'
import { testKeySnapshot, useTestKey } from '@/features/test-mode'
import { configureHttp } from '@/lib/api/http'
import { useRecentItems } from '@/lib/recent-items'
import { queryClient } from './query-client'

/** Wires the framework-free HTTP client to the app's stores. Called once from main.tsx. */
export function setupHttp() {
  configureHttp({
    getAccessToken: () => sessionSnapshot().accessToken,
    refreshAccessToken: refreshSession,
    getMerchantKey: testKeySnapshot,
    // The server refused the session mid-use: back to sign-in, which explains why.
    onSessionExpired: () => useSession.getState().signOut('expired'),
  })
}

/**
 * Forget everything tied to the previous user whenever a session ends, however
 * it ends (sign-out here or in another tab, expiry). Called once from main.tsx.
 */
export function watchSessionEnd() {
  return useSession.subscribe((state, previous) => {
    if (previous.status === 'authenticated' && state.status !== 'authenticated') {
      useTestKey.getState().disconnect()
      useRecentItems.getState().clear()
      queryClient.clear()
    }
  })
}
