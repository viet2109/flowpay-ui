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

type SessionState =
  | { status: 'checking'; accessToken: null; user: null; expiresAt: null }
  | { status: 'anonymous'; accessToken: null; user: null; expiresAt: null }
  | { status: 'authenticated'; accessToken: string; user: SessionUser; expiresAt: number }

interface SessionActions {
  /** Store a freshly issued access token. `email` is only known right after login. */
  signIn: (accessToken: string, expiresIn: number, email?: string) => void
  signOut: () => void
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

const anonymous = { status: 'anonymous', accessToken: null, user: null, expiresAt: null } as const

export const useSession = create<SessionState & SessionActions>()((set) => ({
  status: 'checking',
  accessToken: null,
  user: null,
  expiresAt: null,

  signIn: (accessToken, expiresIn, email) => {
    const claims = decodeClaims(accessToken)
    if (!claims) {
      set(anonymous)
      return
    }
    if (email) rememberEmail(claims.sub, email)
    set({
      status: 'authenticated',
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      user: {
        id: claims.sub,
        email: email ?? recallEmail(claims.sub),
        merchantId: claims.merchant,
        role: claims.role,
      },
    })
  },

  signOut: () => set(anonymous),
}))

/** Non-React access for the HTTP layer. */
export const sessionSnapshot = () => useSession.getState()
