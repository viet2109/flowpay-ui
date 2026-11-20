import { isApiError, isSessionRejected } from '@/lib/api/errors'
import { authApi, type LoginResult } from './api'
import { sessionSnapshot, useSession } from './session-store'

/**
 * Session lifecycle across tabs.
 *
 * The refresh token rotates and its cookie is shared by every tab. Two tabs
 * refreshing at once would present the same token; the second gets
 * REFRESH_TOKEN_REVOKED although the session is fine. So:
 *  - a Web Lock lets one tab refresh at a time, and a tab that waited for the
 *    lock uses the token another tab just obtained instead of refreshing again;
 *  - a BroadcastChannel shares new tokens and sign-outs, so every tab stays in
 *    step (one refresh timer fires, the others receive its token).
 * The access token only ever lives in memory.
 */
type Message = { type: 'token'; accessToken: string; expiresIn: number } | { type: 'signed-out' }

const LOCK = 'flowpay-session-refresh'
/** A token with less than this left is not worth sharing or reusing. */
const MIN_REMAINING_MS = 60_000

const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('flowpay-session')

function broadcast(message: Message) {
  channel?.postMessage(message)
}

channel?.addEventListener('message', (event: MessageEvent<Message>) => {
  const message = event.data
  if (message.type === 'token') useSession.getState().signIn(message.accessToken, message.expiresIn)
  else if (message.type === 'signed-out' && sessionSnapshot().status === 'authenticated')
    useSession.getState().signOut('elsewhere')
})

/** Runs `task` while holding the cross-tab refresh lock (no lock API: runs directly). */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  return locks ? locks.request(LOCK, task) : task()
}

/**
 * Exchange the refresh cookie for a new access token (rotates the cookie).
 * If another tab refreshed while this one waited for the lock, its token is used.
 */
export function refreshSession(): Promise<string> {
  const requestedAt = Date.now()
  return withRefreshLock(async () => {
    const current = sessionSnapshot()
    if (
      current.status === 'authenticated' &&
      current.issuedAt >= requestedAt &&
      current.expiresAt - Date.now() > MIN_REMAINING_MS
    )
      return current.accessToken
    const { accessToken, expiresIn } = await authApi.refresh()
    useSession.getState().signIn(accessToken, expiresIn)
    broadcast({ type: 'token', accessToken, expiresIn })
    return accessToken
  })
}

/** After the login form succeeds: sign in here and in the other open tabs. */
export function completeSignIn(result: LoginResult) {
  useSession.getState().signIn(result.accessToken, result.expiresIn, result.user.email)
  broadcast({ type: 'token', accessToken: result.accessToken, expiresIn: result.expiresIn })
}

/**
 * On app start: restore the session from the refresh cookie, if any. A refused
 * session means signed out; a backend that cannot answer (network, 429, 5xx)
 * leaves the question open and shows a retry screen instead of the login page.
 */
export async function restoreSession() {
  try {
    await refreshSession()
  } catch (error) {
    if (isSessionRejected(error)) useSession.getState().signOut()
    else useSession.getState().markUnreachable(error)
  }
}

/** "Try again" on the unreachable screen. */
export async function retryRestoreSession() {
  useSession.setState({
    status: 'checking',
    accessToken: null,
    user: null,
    expiresAt: null,
    issuedAt: null,
    ended: null,
  })
  await restoreSession()
}

let refreshTimer: number | undefined

function schedule(delayMs: number) {
  window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(proactiveRefresh, delayMs)
}

function proactiveRefresh() {
  if (sessionSnapshot().status !== 'authenticated') return
  refreshSession().catch((error: unknown) => {
    if (isSessionRejected(error)) {
      useSession.getState().signOut('expired')
      return
    }
    // Keep the session and try again: after Retry-After for a 429, else in 30 s.
    const retryAfter = isApiError(error) ? error.retryAfter : undefined
    schedule((retryAfter ?? 30) * 1000)
  })
}

/**
 * Refresh one minute before the 15-minute access token expires, so an open
 * dashboard never shows a 401 flash. The 401 retry in http.ts is the fallback.
 * A token received from another tab reschedules the timer, so only one tab
 * refreshes per cycle.
 */
export function startProactiveRefresh() {
  return useSession.subscribe((state, previous) => {
    if (state.status !== 'authenticated') {
      window.clearTimeout(refreshTimer)
      return
    }
    if (previous.status === 'authenticated' && previous.expiresAt === state.expiresAt) return
    schedule(Math.max(state.expiresAt - Date.now() - MIN_REMAINING_MS, 5_000))
  })
}

/** Sign out here and in every other open tab. */
export async function logout() {
  try {
    await authApi.logout()
  } finally {
    useSession.getState().signOut('signed-out')
    broadcast({ type: 'signed-out' })
  }
}
