import { create } from 'zustand'
import { decodeClaims } from '@/lib/jwt'

/**
 * Dashboard session. The access token lives in memory only; the refresh token
 * is an HttpOnly cookie the browser manages (we never see it). A page reload
 * therefore starts at `checking` and calls /auth/refresh to restore the session.
 */
export interface SessionUser {
  id: string
  email: string | null
  merchantId: string
  role: string
}

/** Why the last session ended; the sign-in page explains it. */
export type SessionEnd = 'expired' | 'signed-out' | 'elsewhere'

type SessionState =
  | { status: 'checking'; accessToken: null; user: null; expiresAt: null; issuedAt: null; ended: null }
  | {
      status: 'anonymous'
      accessToken: null
      user: null
      expiresAt: null
      issuedAt: null
      ended: SessionEnd | null
    }
  /** The session could not be checked (backend unreachable or rate limited); it may still be valid. */
  | {
      status: 'unreachable'
      accessToken: null
      user: null
      expiresAt: null
      issuedAt: null
      ended: null
      error: unknown
    }
  | {
      status: 'authenticated'
      accessToken: string
      user: SessionUser
      expiresAt: number
      /** When this tab received the token, to tell a fresh one from a stale one. */
      issuedAt: number
      ended: null
    }

interface SessionActions {
  /** Store a freshly issued access token. `email` is only known right after login. */
  signIn: (accessToken: string, expiresIn: number, email?: string) => void
  signOut: (ended?: SessionEnd) => void
  markUnreachable: (error: unknown) => void
}

// The login response is the only place the email appears; remember it per user
// so the account menu can still show it after a reload. Not sensitive.
const EMAIL_KEY = 'flowpay.lastEmail'

function rememberEmail(userId: string, email: string) {
  try {
    localStorage.setItem(EMAIL_KEY, JSON.stringify({ userId, email }))
  } catch {
    /* storage unavailable: the menu just shows the user id */
  }
}

function recallEmail(userId: string): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(EMAIL_KEY) ?? 'null') as {
      userId: string
      email: string
    } | null
    return saved?.userId === userId ? saved.email : null
  } catch {
    return null
  }
}

const empty = { accessToken: null, user: null, expiresAt: null, issuedAt: null } as const

export const useSession = create<SessionState & SessionActions>()((set) => ({
  status: 'checking',
  ...empty,
  ended: null,

  signIn: (accessToken, expiresIn, email) => {
    const claims = decodeClaims(accessToken)
    if (!claims) {
      set({ status: 'anonymous', ...empty, ended: null })
      return
    }
    if (email) rememberEmail(claims.sub, email)
    const now = Date.now()
    set({
      status: 'authenticated',
      accessToken,
      expiresAt: now + expiresIn * 1000,
      issuedAt: now,
      ended: null,
      user: {
        id: claims.sub,
        email: email ?? recallEmail(claims.sub),
        merchantId: claims.merchant,
        role: claims.role,
      },
    })
  },

  signOut: (ended) => set({ status: 'anonymous', ...empty, ended: ended ?? null }),

  markUnreachable: (error) => set({ status: 'unreachable', ...empty, ended: null, error }),
}))

/** Non-React access for the HTTP layer. */
export const sessionSnapshot = () => useSession.getState()
