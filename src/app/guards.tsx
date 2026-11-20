import { WifiSlashIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { retryRestoreSession, useSession } from '@/features/auth'
import { useErrorMessage } from '@/i18n'

function Splash() {
  const { t } = useTranslation('common')
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label={t('loading')}>
      <Logo withWordmark={false} className="animate-pulse" />
    </div>
  )
}

/**
 * The session could not be checked: the backend did not answer, or asked us to
 * slow down. The session may still be valid, so this is not the sign-in page.
 */
function Unreachable() {
  const { t } = useTranslation('shell')
  const errorMessage = useErrorMessage()
  const error = useSession((s) => (s.status === 'unreachable' ? s.error : null))
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center px-6 sm:items-center">
      <div className="w-full max-w-sm">
        <Logo />
        <WifiSlashIcon className="mt-10 size-5 text-danger" />
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{t('unreachable.title')}</h1>
        <p className="mt-1 text-sm text-ink-2">{errorMessage(error)}</p>
        <p className="mt-1 text-sm text-ink-2">{t('unreachable.body')}</p>
        <Button variant="primary" className="mt-6" onClick={() => void retryRestoreSession()}>
          {t('unreachable.retry')}
        </Button>
      </div>
    </div>
  )
}

/** Dashboard routes: wait for the session restore, then require a signed-in user. */
export function RequireAuth() {
  const status = useSession((s) => s.status)
  const location = useLocation()
  if (status === 'checking') return <Splash />
  if (status === 'unreachable') return <Unreachable />
  if (status === 'anonymous')
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/**
 * Login/register: signed-in users go to the page that sent them to sign in, or
 * the dashboard. It must agree with LoginPage's own redirect: both run when the
 * session starts, and this one runs last.
 */
export function GuestOnly() {
  const status = useSession((s) => s.status)
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  if (status === 'checking') return <Splash />
  if (status === 'unreachable') return <Unreachable />
  if (status === 'authenticated') return <Navigate to={from} replace />
  return <Outlet />
}
