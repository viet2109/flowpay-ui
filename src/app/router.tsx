import { createBrowserRouter } from 'react-router'
// The auth and merchant features are in the main bundle (session store, sidebar), but
// their pages are not: they load on demand and bring the form libraries with them.
import { loadAuthPages } from '@/features/auth'
import { loadMerchantPages } from '@/features/merchant'
import { GuestOnly, RequireAuth } from './guards'
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { NotFoundPage, RouteErrorPage } from './RouteErrorPage'

/**
 * Each feature is its own lazily-loaded chunk. A page is loaded via the
 * feature's public index, never by reaching into its folders.
 */
const payments = () => import('@/features/payments')
const webhooks = () => import('@/features/webhooks')

/** Development-only routes; the DEV branch is removed from production builds. */
const devRoutes = import.meta.env.DEV
  ? [
      {
        path: '/dev/ui',
        lazy: async () => ({ Component: (await import('./dev/UiGalleryPage')).UiGalleryPage }),
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
            element: <AppLayout />,
            errorElement: <RouteErrorPage />,
            children: [
              {
                index: true,
                lazy: async () => ({ Component: (await import('@/features/overview')).OverviewPage }),
              },
              { path: 'payments', lazy: async () => ({ Component: (await payments()).PaymentsPage }) },
              {
                path: 'payments/:paymentId',
                lazy: async () => ({ Component: (await payments()).PaymentDetailPage }),
              },
              {
                path: 'refunds/:refundId',
                lazy: async () => ({ Component: (await payments()).RefundDetailPage }),
              },
              {
                path: 'developers/api-keys',
                lazy: async () => ({ Component: (await import('@/features/api-keys')).ApiKeysPage }),
              },
              {
                path: 'developers/webhooks',
                lazy: async () => ({ Component: (await webhooks()).WebhooksPage }),
              },
              {
                path: 'developers/webhooks/deliveries',
                lazy: async () => ({ Component: (await webhooks()).DeliveriesPage }),
              },
              {
                path: 'developers/webhooks/:endpointId',
                lazy: async () => ({ Component: (await webhooks()).EndpointDetailPage }),
              },
              {
                path: 'settings',
                lazy: async () => ({ Component: (await loadMerchantPages()).SettingsPage }),
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
