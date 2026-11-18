import { refreshSession, sessionSnapshot, useSession } from '@/features/auth'
import { testKeySnapshot, useTestKey } from '@/features/test-mode'
import { configureHttp } from '@/lib/api/http'
import { queryClient } from './query-client'

/** Wires the framework-free HTTP client to the app's stores. Called once from main.tsx. */
export function setupHttp() {
  configureHttp({
    getAccessToken: () => sessionSnapshot().accessToken,
    refreshAccessToken: refreshSession,
    getMerchantKey: testKeySnapshot,
    onSessionExpired: signOutLocally,
  })
}

/** Forget everything tied to the previous user. */
export function signOutLocally() {
  useSession.getState().signOut()
  useTestKey.getState().disconnect()
  queryClient.clear()
}
