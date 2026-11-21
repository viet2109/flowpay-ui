import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { configureHttp } from '@/lib/api/http'
import type { WebhookDelivery, WebhookDeliveryDetail, WebhookEndpoint } from '../types'
import { DeliveriesView } from './DeliveriesView'

const now = new Date().toISOString()
const endpoints: WebhookEndpoint[] = [
  {
    id: 'wep_on',
    url: 'https://abc.store/hooks/flowpay',
    status: 'ACTIVE',
    events: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'wep_off',
    url: 'https://abc.store/hooks/old',
    status: 'DISABLED',
    events: [],
    createdAt: now,
    updatedAt: now,
  },
]
const delivery: WebhookDelivery = {
  id: 'wdl_1',
  endpointId: 'wep_on',
  eventId: 'evt_1',
  eventType: 'payment.succeeded',
  resourceType: 'PAYMENT_INTENT',
  resourceId: 'pi_1',
  status: 'DELIVERED',
  attemptCount: 1,
  nextAttemptAt: null,
  deliveredAt: now,
  lastHttpStatus: 204,
  lastError: null,
  createdAt: now,
  updatedAt: now,
}
const detail: WebhookDeliveryDetail = {
  ...delivery,
  attempts: [
    { attemptNo: 1, startedAt: now, finishedAt: now, httpStatus: 204, durationMs: 40, errorMessage: null },
  ],
}

/** List replies per request; tests override for empty and past-the-end pages. */
let list: (query: URLSearchParams) => { items: WebhookDelivery[]; total: number }
/** Makes the list request fail for these filters. */
let failList: (query: URLSearchParams) => boolean
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), 'http://localhost')
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    })
  if (url.pathname.endsWith('/webhook-endpoints')) return json(200, { data: endpoints })
  if (url.pathname.endsWith('/webhook-deliveries/wdl_1')) return json(200, { data: detail })
  if (url.pathname.includes('/webhook-deliveries/'))
    return json(404, {
      status: 404,
      code: 'WEBHOOK_DELIVERY_NOT_FOUND',
      title: 'Webhook delivery not found',
      requestId: 'req_MISSING',
    })
  if (failList(url.searchParams))
    return json(500, { status: 500, code: 'INTERNAL_ERROR', title: 'Internal error', requestId: 'req_LIST' })
  const { items, total } = list(url.searchParams)
  const pageNo = Number(url.searchParams.get('page') ?? 0)
  return json(200, {
    data: items,
    meta: {
      page: pageNo,
      size: 20,
      totalElements: total,
      totalPages: Math.ceil(total / 20),
      hasNext: (pageNo + 1) * 20 < total,
      hasPrevious: pageNo > 0,
    },
  })
})
const listQueries = () =>
  fetchMock.mock.calls
    .map(([input]) => new URL(String(input), 'http://x'))
    .filter((u) => u.pathname.endsWith('/webhook-deliveries'))
    .map((u) => u.searchParams)

/** Shows the current query string and offers the browser's Back. */
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

function renderView(search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter
          initialEntries={['/start', `/developers/webhooks/deliveries${search}`]}
          initialIndex={1}
        >
          <Routes>
            <Route path="/start" element={<p>Somewhere else</p>} />
            <Route
              path="/developers/webhooks/deliveries"
              element={
                <>
                  <DeliveriesView />
                  <Location />
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
const search = () => new URLSearchParams(screen.getByTestId('search').textContent ?? '')

beforeEach(() => {
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    onSessionExpired: () => {},
  })
  list = () => ({ items: [delivery], total: 1 })
  failList = () => false
})

afterEach(() => vi.unstubAllGlobals())

describe('DeliveriesView', () => {
  it('sends the filters in the URL to the API', async () => {
    renderView('?status=DEAD&eventType=refund.failed&endpointId=wep_on&page=2')
    await waitFor(() => expect(listQueries().length).toBeGreaterThan(0))
    const query = listQueries()[0]!
    expect(Object.fromEntries(query)).toMatchObject({
      status: 'DEAD',
      eventType: 'refund.failed',
      endpointId: 'wep_on',
      page: '2',
      size: '20',
    })
  })

  it('ignores filter values the API would reject', async () => {
    renderView('?status=LOST&eventType=payment.lost&page=-3')
    await waitFor(() => expect(listQueries().length).toBeGreaterThan(0))
    expect(Object.fromEntries(listQueries()[0]!)).toEqual({ page: '0', size: '20' })
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
  })

  it('goes back to the first page when a filter changes', async () => {
    const user = renderView('?page=3&eventType=payment.succeeded')
    await screen.findByRole('row', { name: /payment.succeeded/ })
    await user.click(screen.getByRole('radio', { name: 'Dead' }))
    expect(search().get('status')).toBe('DEAD')
    expect(search().get('eventType')).toBe('payment.succeeded')
    expect(search().has('page')).toBe(false)
  })

  it('opens a delivery as a new history entry, so Back closes it', async () => {
    const user = renderView('?status=DELIVERED')
    await user.click(await screen.findByRole('row', { name: /payment\.succeeded/ }))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText('Provider confirmed the charge.')).toBeInTheDocument()
    expect(search().get('delivery')).toBe('wdl_1')

    // The modal sheet hides the page from the accessibility tree; Back is the browser's.
    fireEvent.click(screen.getByRole('button', { name: 'Browser back', hidden: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(search().get('status')).toBe('DELIVERED')
    expect(search().has('delivery')).toBe(false)
  })

  it('closes a shared delivery link without leaving the list', async () => {
    const user = renderView('?status=DELIVERED&delivery=wdl_1')
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(search().get('status')).toBe('DELIVERED')
    expect(search().has('delivery')).toBe(false)
    expect(screen.queryByText('Somewhere else')).not.toBeInTheDocument()
  })

  it('says when a delivery does not exist, without offering to ask again', async () => {
    renderView('?delivery=wdl_gone')
    const sheet = await screen.findByRole('dialog')
    expect(
      await within(sheet).findByText('There is no delivery with this ID in your account.'),
    ).toBeInTheDocument()
    expect(within(sheet).getByTitle('req_MISSING')).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers the first page when a link points past the last one', async () => {
    list = (query) => (query.get('page') === '7' ? { items: [], total: 3 } : { items: [delivery], total: 1 })
    const user = renderView('?page=7')
    expect(await screen.findByText('This page is past the last delivery')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Go to the first page' }))
    expect(search().has('page')).toBe(false)
    expect(await screen.findByRole('row', { name: /payment\.succeeded/ })).toBeInTheDocument()
  })

  it('separates no deliveries at all from no matches, and clears filters but not the page', async () => {
    list = (query) => (query.get('status') ? { items: [], total: 0 } : { items: [delivery], total: 1 })
    const user = renderView('?status=DEAD')
    expect(await screen.findByText('No deliveries match these filters')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(search().toString()).toBe('')
    expect(await screen.findByRole('row', { name: /payment\.succeeded/ })).toBeInTheDocument()
  })

  it('names disabled endpoints and keeps an unknown endpoint filter visible', async () => {
    list = () => ({ items: [], total: 0 })
    renderView('?endpointId=wep_elsewhere')
    const select = screen.getByRole('combobox', { name: 'Endpoint' })
    await waitFor(() => expect(select).toHaveValue('wep_elsewhere'))
    expect(within(select).getByRole('option', { name: 'Endpoint wep_elsewhere' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'abc.store/hooks/old (disabled)' })).toBeInTheDocument()
    expect(await screen.findByText('No deliveries match these filters')).toBeInTheDocument()
  })

  it('does not show the previous filter’s rows when the new filter fails to load', async () => {
    failList = (query) => query.get('status') === 'DEAD'
    const user = renderView()
    await screen.findByRole('row', { name: /payment.succeeded/ })
    await user.click(screen.getByRole('radio', { name: 'Dead' }))
    expect(await screen.findByText('Could not load this')).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /payment.succeeded/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Could not refresh. What you see may be out of date.')).not.toBeInTheDocument()
  })
})
