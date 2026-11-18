import { Navigate, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/logo'
import { useSession } from '@/features/auth'

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <Logo withWordmark={false} className="animate-pulse" />
    </div>
  )
}

/** Dashboard routes: wait for the session restore, then require a signed-in user. */
export function RequireAuth() {
  const status = useSession((s) => s.status)
  const location = useLocation()
  if (status === 'checking') return <Splash />
  if (status === 'anonymous')
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Login/register: signed-in users go straight to the dashboard. */
export function GuestOnly() {
  const status = useSession((s) => s.status)
  if (status === 'checking') return <Splash />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}
