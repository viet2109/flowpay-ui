import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { configureHttp } from '@/lib/api/http'
import { OverviewPage } from './OverviewPage'

const now = new Date().toISOString()
const page = (totalElements: number) => ({
  data: [],
  meta: { page: 0, size: 1, totalElements, totalPages: totalElements, hasNext: false, hasPrevious: false },
})
const problem = { status: 503, code: 'INTERNAL_ERROR', title: 'x', requestId: 'req_COUNTS' }

/** Payment counts fail while this is true. */
let paymentsFail = false
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), 'http://localhost')
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    })
  if (url.pathname.endsWith('/merchant'))
    return json(200, { data: { id: 'mrc_1', name: 'ABC Store', status: 'ACTIVE', createdAt: now } })
  if (url.pathname.endsWith('/api-keys')) return json(200, { data: [] })
  if (url.pathname.endsWith('/webhook-endpoints')) return json(200, { data: [] })
  if (url.pathname.endsWith('/webhook-deliveries')) return json(200, page(0))
  if (url.pathname.endsWith('/merchant/payments'))
    return paymentsFail ? json(503, problem) : json(200, page(0))
  return json(404, { status: 404, code: 'NOT_FOUND' })
})
const paymentReads = () =>
  fetchMock.mock.calls.filter(([input]) =>
    new URL(String(input), 'http://x').pathname.endsWith('/merchant/payments'),
  ).length

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter>
          <OverviewPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}
const attention = () => screen.getByRole('heading', { name: 'Needs attention' }).closest('section')!

beforeEach(() => {
  paymentsFail = false
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    onSessionExpired: () => {},
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('Needs attention', () => {
  it('says all clear only when every count loaded as zero', async () => {
    renderPage()
    expect(await screen.findByText('All clear')).toBeInTheDocument()
  })

  it('never says all clear when a count failed: it shows "—", the reason and a retry', async () => {
    paymentsFail = true
    const user = renderPage()
    const panel = await waitFor(() => {
      const section = attention()
      expect(within(section).getByText(/Some counts could not be loaded/)).toBeInTheDocument()
      return section
    })
    expect(screen.queryByText('All clear')).not.toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: /awaiting the provider’s outcome/ })).toHaveTextContent(
      '—',
    )
    expect(within(panel).getByTitle('req_COUNTS')).toBeInTheDocument()

    paymentsFail = false
    const before = paymentReads()
    await user.click(within(panel).getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(paymentReads()).toBeGreaterThan(before))
    expect(await screen.findByText('All clear')).toBeInTheDocument()
  })
})
