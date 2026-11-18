import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start py-16">
      <p className="font-mono text-xs text-ink-3">404</p>
      <h1 className="mt-2 text-xl font-semibold">This page does not exist</h1>
      <p className="mt-1 text-sm text-ink-2">Check the URL, or paste a payment ID into the search (⌘K).</p>
      <Button asChild className="mt-6">
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  )
}

/** Last-resort boundary for render errors and failed lazy chunks (e.g. after a deploy). */
export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-start justify-center px-6">
      <p className="font-mono text-xs text-danger">Unexpected error</p>
      <h1 className="mt-2 text-xl font-semibold">Something broke on this screen</h1>
      <p className="mt-1 text-sm text-ink-2">
        Your data is safe: nothing is changed by a display error. Reload to try again.
      </p>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="mt-4 max-w-full overflow-x-auto rounded-md bg-surface-sunken p-3 font-mono text-xs text-ink-2">
          {error.message}
        </pre>
      )}
      <Button className="mt-6" onClick={() => window.location.reload()}>
        Reload
      </Button>
    </div>
  )
}
