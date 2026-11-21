import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth'
import { configureHttp } from '@/lib/api/http'
import { PaymentDetailPage } from './PaymentDetailPage'

const now = new Date().toISOString()
const payment = (status: string) => ({
  id: 'pi_1',
  orderId: 'ORDER-1',
  description: 'Test',
  amount: 500000,
  currency: 'VND',
  status,
  refundedAmount: 0,
  refundableAmount: status === 'SUCCEEDED' ? 500000 : 0,
  createdAt: now,
  updatedAt: now,
})
const page = {
  data: [],
  meta: { page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false },
}

let status = 'CREATED'
let notFound = false
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const path = new URL(String(input), 'http://localhost').pathname
  if (notFound && path.endsWith('/pi_1'))
    return new Response(
      JSON.stringify({
        status: 404,
        code: 'PAYMENT_NOT_FOUND',
        title: 'Payment not found',
        requestId: 'req_GONE',
      }),
      { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
    )
  const body = path.endsWith('/pi_1')
    ? { data: payment(status) }
    : path.endsWith('/transactions')
      ? { data: [] }
      : page
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

function signInAs(role: string) {
  useSession.setState({
    status: 'authenticated',
    accessToken: 'token',
    user: { id: 'usr_1', email: null, merchantId: 'mrc_1', role },
    expiresAt: Date.now() + 900_000,
    issuedAt: Date.now(),
    ended: null,
  })
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/payments/pi_1']}>
          <Routes>
            <Route path="/payments/:paymentId" element={<PaymentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  notFound = false
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    onSessionExpired: () => {},
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('PaymentDetailPage', () => {
  it('reads the payment from the dashboard API with the session, no test key', async () => {
    signInAs('OWNER')
    renderPage()
    expect(await screen.findByRole('button', { name: 'Confirm payment' })).toBeInTheDocument()
    const paths = fetchMock.mock.calls.map(([input]) => new URL(String(input), 'http://x').pathname)
    expect(paths).toContain('/api/v1/merchant/payments/pi_1')
    expect(paths.some((p) => p.includes('payment-intents'))).toBe(false)
  })

  it.each(['ADMIN', 'DEVELOPER', 'FINANCE'])(
    'shows %s the payment without confirm or refund',
    async (role) => {
      signInAs(role)
      status = 'CREATED'
      renderPage()
      expect(await screen.findByText('Order ORDER-1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Confirm payment' })).not.toBeInTheDocument()
    },
  )

  it('offers a refund of a succeeded payment to the owner only', async () => {
    status = 'SUCCEEDED'
    signInAs('OWNER')
    renderPage()
    expect(await screen.findByRole('button', { name: 'Refund' })).toBeInTheDocument()
  })

  it('does not offer a refund to other roles', async () => {
    status = 'SUCCEEDED'
    signInAs('FINANCE')
    renderPage()
    expect(await screen.findByText('Order ORDER-1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument()
  })

  it('says a payment does not exist, without offering to ask again', async () => {
    notFound = true
    signInAs('OWNER')
    renderPage()
    expect(await screen.findByText('There is no payment with this ID in your account.')).toBeInTheDocument()
    expect(screen.getByTitle('req_GONE')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})
