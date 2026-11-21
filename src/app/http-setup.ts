import { refreshSession, sessionSnapshot, useSession } from '@/features/auth'
import { configureHttp } from '@/lib/api/http'
import { useRecentItems } from '@/lib/recent-items'
import { queryClient } from './query-client'

/** Wires the framework-free HTTP client to the app's stores. Called once from main.tsx. */
export function setupHttp() {
  configureHttp({
    getAccessToken: () => sessionSnapshot().accessToken,
    refreshAccessToken: refreshSession,
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
      useRecentItems.getState().clear()
      queryClient.clear()
    }
  })
}

/**
 * Earlier versions kept a connected test API key in sessionStorage to read
 * payments. Nothing reads it now; remove it so a raw key does not linger in a tab
 * that ran the old version. Storage can be unavailable (private mode): ignore that.
 */
export function forgetLegacyTestKey() {
  try {
    sessionStorage.removeItem('flowpay.testKey')
  } catch {
    // Nothing stored, nothing to remove.
  }
}
