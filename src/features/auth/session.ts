import { authApi } from './api'
import { sessionSnapshot, useSession } from './session-store'

/** Exchange the refresh cookie for a new access token. Rotates the cookie. */
export async function refreshSession(): Promise<string> {
  const { accessToken, expiresIn } = await authApi.refresh()
  useSession.getState().signIn(accessToken, expiresIn)
  return accessToken
}

/** On app start: restore the session from the refresh cookie, if any. */
export async function restoreSession() {
  try {
    await refreshSession()
  } catch {
    useSession.getState().signOut()
  }
}

let refreshTimer: number | undefined

/**
 * Refresh one minute before the 15-minute access token expires, so an open
 * dashboard never shows a 401 flash. The 401 retry in http.ts is the fallback.
 */
export function startProactiveRefresh() {
  return useSession.subscribe((state) => {
    window.clearTimeout(refreshTimer)
    if (state.status !== 'authenticated') return
    const delay = Math.max(state.expiresAt - Date.now() - 60_000, 5_000)
    refreshTimer = window.setTimeout(() => {
      if (sessionSnapshot().status === 'authenticated') refreshSession().catch(() => undefined)
    }, delay)
  })
}

export async function logout() {
  try {
    await authApi.logout()
  } finally {
    useSession.getState().signOut()
  }
}
