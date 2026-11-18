import { createBrowserRouter } from 'react-router'
// auth and merchant are already in the main bundle (session store, sidebar), so lazy-loading them gains nothing.
import { LoginPage, RegisterPage } from '@/features/auth'
import { SettingsPage } from '@/features/merchant'
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

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: '/login', Component: LoginPage },
              { path: '/register', Component: RegisterPage },
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
              { path: 'settings', Component: SettingsPage },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
