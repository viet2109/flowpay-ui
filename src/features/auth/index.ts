// Public surface of the auth feature. Other modules import from '@/features/auth' only.
/**
 * Sign-in and sign-up pages, loaded on demand: they bring the form libraries
 * (react-hook-form, zod), which a signed-in visit does not need up front.
 */
export const loadAuthPages = () => import('./pages')
export { AuthAside } from './components/AuthAside'
export { useSession, sessionSnapshot, type SessionUser } from './session-store'
export { refreshSession, restoreSession, startProactiveRefresh, logout } from './session'
export type { LoginResult, RefreshResult, RegisterInput, RegisterResult } from './api'
