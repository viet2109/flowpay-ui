import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth'
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
/** What the setup steps read; tests change them. */
let keys: unknown[] = []
let endpoints: unknown[] = []
let paymentTotal = 0
let endpointsFail = false
/** Resolved by a test to release the payment requests (to see the loading state). */
let holdPayments: Promise<void> | null = null
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), 'http://localhost')
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    })
  if (url.pathname.endsWith('/merchant'))
    return json(200, { data: { id: 'mrc_1', name: 'ABC Store', status: 'ACTIVE', createdAt: now } })
  if (url.pathname.endsWith('/api-keys')) return json(200, { data: keys })
  if (url.pathname.endsWith('/webhook-endpoints'))
    return endpointsFail ? json(503, problem) : json(200, { data: endpoints })
  if (url.pathname.endsWith('/webhook-deliveries')) return json(200, page(0))
  if (url.pathname.endsWith('/merchant/payments')) {
    if (holdPayments) await holdPayments
    if (paymentsFail) return json(503, problem)
    // The setup step asks without a status; the counts ask per status.
    return json(200, page(url.searchParams.has('status') ? 0 : paymentTotal))
  }
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
  keys = []
  endpoints = []
  paymentTotal = 0
  endpointsFail = false
  holdPayments = null
  useSession.setState({
    status: 'anonymous',
    accessToken: null,
    user: null,
    expiresAt: null,
    issuedAt: null,
    ended: null,
  })
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

describe('Get set up', () => {
  const now2 = new Date().toISOString()
  const signInAs = (role: string) =>
    useSession.setState({
      status: 'authenticated',
      accessToken: 'token',
      user: { id: 'usr_1', email: null, merchantId: 'mrc_1', role },
      expiresAt: Date.now() + 900_000,
      issuedAt: Date.now(),
      ended: null,
    })
  const steps = () =>
    within(screen.getByRole('heading', { name: 'Get set up' }).closest('section')!).getAllByRole('listitem')

  it('lists three steps for the owner and counts what is done', async () => {
    signInAs('OWNER')
    keys = [{ id: 'key_1', name: 'k', prefix: 'fp_test_A', status: 'ACTIVE', createdAt: now2 }]
    renderPage()
    expect(await screen.findByText('1 of 3 done')).toBeInTheDocument()
    expect(steps().map((s) => s.textContent)).toEqual([
      '1.Create an API key for your backend',
      '2.Add a webhook endpoint',
      '3.Create your first test payment',
    ])
  })

  it('does not give other roles a payment step they cannot take', async () => {
    signInAs('DEVELOPER')
    renderPage()
    expect(await screen.findByText('0 of 2 done')).toBeInTheDocument()
    expect(screen.queryByText('Create your first test payment')).not.toBeInTheDocument()
  })

  it('goes away once every step is done', async () => {
    signInAs('OWNER')
    keys = [{ id: 'key_1', name: 'k', prefix: 'fp_test_A', status: 'ACTIVE', createdAt: now2 }]
    endpoints = [
      { id: 'wep_1', url: 'https://a.b/c', status: 'ACTIVE', events: [], createdAt: now2, updatedAt: now2 },
    ]
    paymentTotal = 4
    renderPage()
    expect(await screen.findByText('All clear')).toBeInTheDocument()
    expect(screen.queryByText('Get set up')).not.toBeInTheDocument()
  })

  it('stays hidden when a step could not be checked', async () => {
    signInAs('OWNER')
    endpointsFail = true
    renderPage()
    expect(await screen.findByText('Needs attention')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(3))
    expect(screen.queryByText('Get set up')).not.toBeInTheDocument()
  })

  it('does not flash before every step is known', async () => {
    signInAs('OWNER')
    keys = [{ id: 'key_1', name: 'k', prefix: 'fp_test_A', status: 'ACTIVE', createdAt: now2 }]
    endpoints = [
      { id: 'wep_1', url: 'https://a.b/c', status: 'ACTIVE', events: [], createdAt: now2, updatedAt: now2 },
    ]
    paymentTotal = 4
    let release: () => void = () => {}
    holdPayments = new Promise((r) => (release = r))
    renderPage()
    // Keys and endpoints have loaded: the dead count needs the endpoint list.
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /dead webhook deliver/ })).toHaveTextContent('0'),
    )
    expect(screen.queryByText('Get set up')).not.toBeInTheDocument()
    release()
    expect(await screen.findByText('All clear')).toBeInTheDocument()
    expect(screen.queryByText('Get set up')).not.toBeInTheDocument()
  })
})
