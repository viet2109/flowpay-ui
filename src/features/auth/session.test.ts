import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { authApi } from './api'
import { refreshSession, restoreSession } from './session'
import { useSession } from './session-store'

// A token whose claims decode (sub, merchant, role); the signature is never checked client-side.
const claims = btoa(JSON.stringify({ sub: 'usr_1', merchant: 'mrc_1', role: 'OWNER', exp: 9999999999 }))
const token = (name: string) => `h.${claims}.${name}`

/** A fake Web Locks API: one holder at a time, the rest wait in order. */
function fakeLocks() {
  let tail = Promise.resolve()
  return {
    request: <T>(_name: string, task: () => Promise<T>) => {
      const run = tail.then(task)
      tail = run.then(
        () => undefined,
        () => undefined,
      )
      return run
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('navigator', { ...navigator, locks: fakeLocks() })
  useSession.setState({
    status: 'checking',
    accessToken: null,
    user: null,
    expiresAt: null,
    issuedAt: null,
    ended: null,
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('refreshSession', () => {
  it('uses a token another tab obtained while this one waited for the lock', async () => {
    const refresh = vi.spyOn(authApi, 'refresh').mockImplementation(async () => {
      // While this tab holds the lock, another tab is queued behind it.
      return { accessToken: token('first'), expiresIn: 900 }
    })
    const [first, second] = await Promise.all([refreshSession(), refreshSession()])
    expect(first).toBe(token('first'))
    expect(second).toBe(token('first'))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('refreshes when the token it has is older than its request', async () => {
    useSession.getState().signIn(token('old'), 900)
    await new Promise((r) => setTimeout(r, 5))
    vi.spyOn(authApi, 'refresh').mockResolvedValue({ accessToken: token('new'), expiresIn: 900 })
    expect(await refreshSession()).toBe(token('new'))
  })
})

describe('restoreSession', () => {
  it('signs out when the server refuses the refresh token', async () => {
    vi.spyOn(authApi, 'refresh').mockRejectedValue(
      new ApiError({ status: 401, code: 'REFRESH_TOKEN_EXPIRED' }),
    )
    await restoreSession()
    expect(useSession.getState().status).toBe('anonymous')
  })

  it('does not sign out when the backend cannot answer', async () => {
    const offline = ApiError.client('NETWORK_ERROR', 'offline')
    vi.spyOn(authApi, 'refresh').mockRejectedValue(offline)
    await restoreSession()
    expect(useSession.getState()).toMatchObject({ status: 'unreachable', error: offline })
  })

  it('treats a 429 as "ask again later", not as signed out', async () => {
    vi.spyOn(authApi, 'refresh').mockRejectedValue(
      new ApiError({ status: 429, code: 'RATE_LIMIT_EXCEEDED' }, 60),
    )
    await restoreSession()
    expect(useSession.getState().status).toBe('unreachable')
  })
})
