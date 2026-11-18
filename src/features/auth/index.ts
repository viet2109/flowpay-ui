// Public surface of the auth feature. Other modules import from '@/features/auth' only.
export { LoginPage } from './pages/LoginPage'
export { RegisterPage } from './pages/RegisterPage'
export { AuthAside } from './components/AuthAside'
export { useSession, sessionSnapshot, type SessionUser } from './session-store'
export { refreshSession, restoreSession, startProactiveRefresh, logout } from './session'
export type { LoginResult, RefreshResult, RegisterInput, RegisterResult } from './api'
