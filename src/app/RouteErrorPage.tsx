import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { t } = useTranslation('shell')
  return (
    <div className="flex flex-col items-start py-16">
      <p className="font-mono text-xs text-ink-3">404</p>
      <h1 className="mt-2 text-xl font-semibold">{t('notFound.title')}</h1>
      <p className="mt-1 text-sm text-ink-2">{t('notFound.body', { shortcut: '⌘K' })}</p>
      <Button asChild className="mt-6">
        <Link to="/">{t('notFound.back')}</Link>
      </Button>
    </div>
  )
}

/** Last-resort boundary for render errors and failed lazy chunks (e.g. after a deploy). */
export function RouteErrorPage() {
  const { t } = useTranslation('shell')
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-start justify-center px-6">
      <p className="font-mono text-xs text-danger">{t('crash.eyebrow')}</p>
      <h1 className="mt-2 text-xl font-semibold">{t('crash.title')}</h1>
      <p className="mt-1 text-sm text-ink-2">{t('crash.body')}</p>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="mt-4 max-w-full overflow-x-auto rounded-md bg-surface-sunken p-3 font-mono text-xs text-ink-2">
          {error.message}
        </pre>
      )}
      <Button className="mt-6" onClick={() => window.location.reload()}>
        {t('crash.reload')}
      </Button>
    </div>
  )
}
