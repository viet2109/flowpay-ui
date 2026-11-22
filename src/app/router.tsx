import { createBrowserRouter } from 'react-router'
// The auth and merchant features are in the main bundle (session store, route table), but
// their pages are not: they load on demand and bring the form libraries with them.
import { loadAuthPages } from '@/features/auth'
import { GuestOnly, RequireAuth } from './guards'
import { AuthLayout } from './layouts/AuthLayout'
import { NotFoundPage, RouteErrorPage } from './RouteErrorPage'
import { pages } from './routes'
import { currentLanguage, ensureMessages } from '@/i18n'
import { FEATURE_NAMESPACES } from '@/i18n/resources'

/**
 * Each feature is its own lazily-loaded chunk, loaded with its messages (./routes.ts).
 * A page is loaded via the feature's public index, never by reaching into its folders.
 */

/** Development-only routes; the DEV branch is removed from production builds. */
const devRoutes = import.meta.env.DEV
  ? [
      {
        path: '/dev/ui',
        // The gallery shows every feature's components, so it needs every namespace.
        lazy: async () => {
          await ensureMessages(currentLanguage(), FEATURE_NAMESPACES)
          return { Component: (await import('./dev/UiGalleryPage')).UiGalleryPage }
        },
      },
    ]
  : []

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      ...devRoutes,
      {
        element: <GuestOnly />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: '/login', lazy: async () => ({ Component: (await loadAuthPages()).LoginPage }) },
              { path: '/register', lazy: async () => ({ Component: (await loadAuthPages()).RegisterPage }) },
            ],
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            // The dashboard frame is not needed to sign in: it loads with the first page,
            // in parallel with it (the router fetches every lazy route of a match at once).
            lazy: async () => ({ Component: (await import('./layouts/AppLayout')).AppLayout }),
            errorElement: <RouteErrorPage />,
            children: [
              {
                index: true,
                lazy: async () => ({ Component: (await pages.overview()).OverviewPage }),
              },
              { path: 'payments', lazy: async () => ({ Component: (await pages.payments()).PaymentsPage }) },
              {
                path: 'payments/:paymentId',
                lazy: async () => ({ Component: (await pages.payments()).PaymentDetailPage }),
              },
              {
                path: 'refunds/:refundId',
                lazy: async () => ({ Component: (await pages.payments()).RefundDetailPage }),
              },
              {
                path: 'developers/api-keys',
                lazy: async () => ({ Component: (await pages.apiKeys()).ApiKeysPage }),
              },
              {
                path: 'developers/webhooks',
                lazy: async () => ({ Component: (await pages.webhooks()).WebhooksPage }),
              },
              {
                path: 'developers/webhooks/deliveries',
                lazy: async () => ({ Component: (await pages.webhooks()).DeliveriesPage }),
              },
              {
                path: 'developers/webhooks/:endpointId',
                lazy: async () => ({ Component: (await pages.webhooks()).EndpointDetailPage }),
              },
              {
                path: 'settings',
                lazy: async () => ({ Component: (await pages.settings()).SettingsPage }),
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
