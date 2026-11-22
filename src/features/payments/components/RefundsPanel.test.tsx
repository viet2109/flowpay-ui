import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { configureHttp } from '@/lib/api/http'
import { RefundDetailPage } from '../pages/RefundDetailPage'
import type { Refund } from '../types'
import { RefundsPanel } from './RefundsPanel'

const now = new Date().toISOString()
const refund = (id: string, patch: Partial<Refund> = {}): Refund => ({
  id,
  paymentId: 'pi_1',
  amount: 100000,
  currency: 'VND',
  status: 'SUCCEEDED',
  reason: 'DUPLICATE',
  provider: 'SIMULATOR',
  providerRefundId: 'sim_refund_1',
  failureCode: null,
  failureMessage: null,
  createdAt: now,
  updatedAt: now,
  completedAt: now,
  ...patch,
})
let refunds: Refund[]

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const path = new URL(String(input), 'http://localhost').pathname
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    })
  const single = path.match(/\/merchant\/refunds\/(re_\w+)$/)
  if (single) {
    const found = refunds.find((r) => r.id === single[1])
    return found
      ? json(200, { data: found })
      : json(404, { status: 404, code: 'REFUND_NOT_FOUND', title: 'x', requestId: 'req_NOREFUND' })
  }
  return json(200, {
    data: refunds,
    meta: {
      page: 0,
      size: 20,
      totalElements: refunds.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    },
  })
})

function Location() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="search">{location.search}</output>
      <button type="button" onClick={() => navigate(-1)}>
        Browser back
      </button>
    </>
  )
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/start', path]} initialIndex={1}>
          <Routes>
            <Route path="/start" element={<p>Somewhere else</p>} />
            <Route
              path="/payments/:paymentId"
              element={
                <>
                  <RefundsPanel paymentId="pi_1" />
                  <Location />
                </>
              }
            />
            <Route path="/refunds/:refundId" element={<RefundDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}
const search = () => new URLSearchParams(screen.getByTestId('search').textContent ?? '')

beforeEach(() => {
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    onSessionExpired: () => {},
  })
  refunds = [refund('re_1')]
})

afterEach(() => vi.unstubAllGlobals())

describe('refund sheet on the payment page', () => {
  it('opens as a new history entry, links to the full page, and Back closes it', async () => {
    const user = renderAt('/payments/pi_1')
    await user.click(await screen.findByRole('row', { name: /Duplicate charge/ }))
    const sheet = await screen.findByRole('dialog')
    expect(search().get('refund')).toBe('re_1')
    expect(within(sheet).getByRole('link', { name: 'Open full page' })).toHaveAttribute(
      'href',
      '/refunds/re_1',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Browser back', hidden: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(search().has('refund')).toBe(false)
  })

  it('opens from a shared link and closes without leaving the payment', async () => {
    const user = renderAt('/payments/pi_1?refund=re_1')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText('Somewhere else')).not.toBeInTheDocument()
  })

  it('says a linked refund does not exist, without offering to ask again', async () => {
    renderAt('/payments/pi_1?refund=re_gone')
    const sheet = await screen.findByRole('dialog')
    expect(
      await within(sheet).findByText('There is no refund with this ID in your account.'),
    ).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})

describe('RefundDetailPage', () => {
  it('shows the refund, its reason in words and a way back to the payment', async () => {
    renderAt('/refunds/re_1')
    expect(await screen.findByText('Duplicate charge')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'pi_1' })).toHaveAttribute('href', '/payments/pi_1')
    expect(screen.getByRole('link', { name: /Payment/ })).toHaveAttribute('href', '/payments/pi_1')
  })

  it('explains a failed refund with its code', async () => {
    refunds = [
      refund('re_1', { status: 'FAILED', failureCode: 'REFUND_DECLINED', failureMessage: 'Declined.' }),
    ]
    renderAt('/refunds/re_1')
    expect(await screen.findByText('The provider did not complete the refund')).toBeInTheDocument()
    expect(screen.getByText('REFUND_DECLINED')).toBeInTheDocument()
  })

  it('says a refund does not exist', async () => {
    renderAt('/refunds/re_gone')
    expect(await screen.findByText('There is no refund with this ID in your account.')).toBeInTheDocument()
    expect(screen.getByTitle('req_NOREFUND')).toBeInTheDocument()
  })
})

describe('a refund waiting on its provider', () => {
  const reads = () =>
    fetchMock.mock.calls.filter(([input]) =>
      /\/merchant\/refunds\/re_1$/.test(new URL(String(input), 'http://x').pathname),
    ).length

  it('is read again while fresh, and checked again on request after that', async () => {
    refunds = [refund('re_1', { status: 'PROCESSING', completedAt: null })]
    renderAt('/refunds/re_1')
    expect(await screen.findByText('Waiting for the provider’s outcome')).toBeInTheDocument()
    await waitFor(() => expect(reads()).toBeGreaterThan(1), { timeout: 3500 })
  }, 10_000)

  it('is not read again when it has waited for long, until asked', async () => {
    refunds = [
      refund('re_1', {
        status: 'PROCESSING',
        completedAt: null,
        updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
      }),
    ]
    const user = renderAt('/refunds/re_1')
    expect(await screen.findByText('Waiting for the provider’s outcome')).toBeInTheDocument()
    expect(reads()).toBe(1)
    await user.click(screen.getByRole('button', { name: 'Check again' }))
    await waitFor(() => expect(reads()).toBe(2))
  })
})
