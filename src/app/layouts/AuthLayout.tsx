import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { Logo } from '@/components/logo'
import { AuthAside } from '@/features/auth'

export function AuthLayout() {
  const { t } = useTranslation('shell')
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <main className="flex flex-1 items-start pt-10 pb-12 lg:items-center lg:py-12">
          <Outlet />
        </main>
        <p className="text-xs text-ink-3">{t('auth.footer')}</p>
      </div>
      <div className="hidden lg:block">
        <AuthAside />
      </div>
    </div>
  )
}
