import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth'
import { configureHttp } from '@/lib/api/http'
import { PaymentsPage } from './PaymentsPage'

const now = new Date().toISOString()
const payment = {
  id: 'pi_1',
  orderId: 'ORD-1',
  description: 'Test',
  amount: 500000,
  currency: 'VND',
  status: 'SUCCEEDED',
  refundedAmount: 0,
  refundableAmount: 500000,
  createdAt: now,
  updatedAt: now,
}

/** Total payments the fake backend holds; a page past them comes back empty. */
let total = 1
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), 'http://localhost')
  const page = Number(url.searchParams.get('page') ?? 0)
  const size = Number(url.searchParams.get('size') ?? 20)
  const items = page * size < total ? [payment] : []
  const body = {
    data: items,
    meta: {
      page,
      size,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      hasNext: (page + 1) * size < total,
      hasPrevious: page > 0,
    },
  }
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
const lastQuery = () => new URL(String(fetchMock.mock.calls.at(-1)![0]), 'http://x').searchParams

function Search() {
  return <output data-testid="search">{useLocation().search}</output>
}

function renderPage(search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[`/payments${search}`]}>
          <Routes>
            <Route
              path="/payments"
              element={
                <>
                  <PaymentsPage />
                  <Search />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}

beforeEach(() => {
  total = 1
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    onSessionExpired: () => {},
  })
  useSession.setState({
    status: 'authenticated',
    accessToken: 'token',
    user: { id: 'usr_1', email: null, merchantId: 'mrc_1', role: 'OWNER' },
    expiresAt: Date.now() + 900_000,
    issuedAt: Date.now(),
    ended: null,
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('PaymentsPage', () => {
  it('offers the first page when a link points past the last one', async () => {
    const user = renderPage('?page=9')
    expect(await screen.findByText('This page is past the last payment')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Go to the first page' }))
    // The order shows in its column and, for phones, under the amount (CSS picks one).
    expect((await screen.findAllByText('ORD-1')).length).toBeGreaterThan(0)
    expect(screen.getByTestId('search').textContent).toBe('')
  })

  it('says an inverted date range is wrong and does not send it', async () => {
    renderPage('?from=2026-11-20&to=2026-11-01')
    expect(await screen.findByRole('alert')).toHaveTextContent('The start date is after the end date')
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(lastQuery().has('createdFrom')).toBe(false)
    expect(lastQuery().has('createdTo')).toBe(false)
  })

  it('asks for the chosen page size and keeps it in the URL', async () => {
    total = 30
    const user = renderPage()
    await screen.findByText('1–20 of 30')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50')
    await waitFor(() => expect(lastQuery().get('size')).toBe('50'))
    expect(screen.getByTestId('search').textContent).toBe('?size=50')
  })
})
