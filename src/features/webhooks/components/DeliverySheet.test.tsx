import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { configureHttp } from '@/lib/api/http'
import { useRetryableDeadCount } from '../queries'
import type { WebhookDeliveryDetail, WebhookEndpoint } from '../types'
import { DeliverySheet } from './DeliverySheet'

const now = new Date().toISOString()
const endpoint = (id: string, status: WebhookEndpoint['status']): WebhookEndpoint => ({
  id,
  url: `https://abc.store/hooks/${id}`,
  status,
  events: [],
  createdAt: now,
  updatedAt: now,
})
const http500 = (attemptNo: number) => ({
  attemptNo,
  startedAt: now,
  finishedAt: now,
  httpStatus: 500,
  durationMs: 90,
  errorMessage: 'HTTP_STATUS',
})
const deadDelivery = (): WebhookDeliveryDetail => ({
  id: 'wdl_1',
  endpointId: 'wep_1',
  eventId: 'evt_1',
  eventType: 'payment.succeeded',
  resourceType: 'PAYMENT_INTENT',
  resourceId: 'pi_1',
  status: 'DEAD',
  attemptCount: 6,
  nextAttemptAt: null,
  deliveredAt: null,
  lastHttpStatus: 500,
  lastError: 'HTTP_STATUS',
  createdAt: now,
  updatedAt: now,
  attempts: [1, 2, 3, 4, 5, 6].map(http500),
})

type Reply = { status: number; body?: unknown }
const json = ({ status, body }: Reply) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
  })
const problem = (status: number, code: string, requestId: string): Reply => ({
  status,
  body: { status, code, title: code, requestId },
})

let replies: {
  delivery: () => Reply
  endpoint: () => Reply
  retry: () => Reply
  endpoints: () => Reply
  deadCount: (endpointId: string | null) => number
}
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), 'http://localhost')
  if (url.pathname.endsWith('/retry') && init?.method === 'POST') return json(replies.retry())
  if (url.pathname.endsWith('/webhook-deliveries/wdl_1')) return json(replies.delivery())
  if (url.pathname.endsWith('/webhook-endpoints')) return json(replies.endpoints())
  if (url.pathname.includes('/webhook-endpoints/')) return json(replies.endpoint())
  const total = replies.deadCount(url.searchParams.get('endpointId'))
  return json({
    status: 200,
    body: {
      data: [],
      meta: { page: 0, size: 1, totalElements: total, totalPages: total, hasNext: false, hasPrevious: false },
    },
  })
})
const requests = () =>
  fetchMock.mock.calls.map(
    ([input, init]) => `${init?.method ?? 'GET'} ${new URL(String(input), 'http://x').pathname}`,
  )

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

function renderSheet() {
  render(<DeliverySheet deliveryId="wdl_1" onClose={() => {}} />, { wrapper: wrapper() })
  return userEvent.setup({ delay: null })
}

beforeEach(() => {
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    getMerchantKey: () => null,
    onSessionExpired: () => {},
  })
  replies = {
    delivery: () => ({ status: 200, body: { data: deadDelivery() } }),
    endpoint: () => ({ status: 200, body: { data: endpoint('wep_1', 'ACTIVE') } }),
    retry: () => ({
      status: 202,
      body: { data: { ...deadDelivery(), attempts: undefined, status: 'RETRYING', nextAttemptAt: now } },
    }),
    endpoints: () => ({ status: 200, body: { data: [] } }),
    deadCount: () => 0,
  }
})

afterEach(() => vi.unstubAllGlobals())

describe('DeliverySheet retry rules', () => {
  it('offers a retry for a dead delivery on an active endpoint, and shows it scheduled at once', async () => {
    const user = renderSheet()
    const sheet = await screen.findByRole('dialog')
    expect(await within(sheet).findByText(/Fix the receiver, then retry/)).toBeInTheDocument()

    // The backend now has it RETRYING, so later reads say so too.
    replies.retry = () => {
      replies.delivery = () => ({
        status: 200,
        body: { data: { ...deadDelivery(), status: 'RETRYING', nextAttemptAt: now } },
      })
      return { status: 202, body: { data: { ...deadDelivery(), status: 'RETRYING', nextAttemptAt: now } } }
    }
    await user.click(within(sheet).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(requests()).toContain('POST /api/v1/merchant/webhook-deliveries/wdl_1/retry'))
    expect(await within(sheet).findByText('Manual retry scheduled', { exact: false })).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    // History is kept: still six attempts.
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(6)
  })

  it('does not offer a retry when the endpoint is disabled', async () => {
    replies.endpoint = () => ({ status: 200, body: { data: endpoint('wep_1', 'DISABLED') } })
    renderSheet()
    const sheet = await screen.findByRole('dialog')
    expect(
      await within(sheet).findByText(/endpoint is disabled, so this delivery cannot be retried/),
    ).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('does not claim the endpoint is disabled when it could not be loaded', async () => {
    replies.endpoint = () => problem(500, 'INTERNAL_ERROR', 'req_EP')
    renderSheet()
    const sheet = await screen.findByRole('dialog')
    expect(await within(sheet).findByText(/endpoint could not be loaded/)).toBeInTheDocument()
    expect(within(sheet).queryByText(/endpoint is disabled/)).not.toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('never offers a retry for a delivery that is not dead', async () => {
    replies.delivery = () => ({
      status: 200,
      body: { data: { ...deadDelivery(), status: 'DELIVERED', deliveredAt: now } },
    })
    renderSheet()
    const sheet = await screen.findByRole('dialog')
    expect(await within(sheet).findByText('Delivered on attempt 6')).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('explains a retry the backend refused because the state changed, in the sheet', async () => {
    replies.retry = () => problem(409, 'WEBHOOK_INVALID_STATE', 'req_CONFLICT')
    const user = renderSheet()
    const sheet = await screen.findByRole('dialog')
    await user.click(await within(sheet).findByRole('button', { name: 'Retry' }))
    expect(
      await within(sheet).findByText(/it was already retried, or its endpoint was disabled/),
    ).toBeInTheDocument()
    expect(within(sheet).getByTitle('req_CONFLICT')).toBeInTheDocument()
  })

  it('keeps what it showed when a refresh fails while polling', async () => {
    replies.delivery = () => ({
      status: 200,
      body: { data: { ...deadDelivery(), status: 'RETRYING', nextAttemptAt: now } },
    })
    renderSheet()
    const sheet = await screen.findByRole('dialog')
    await within(sheet).findByText('Manual retry scheduled', { exact: false })
    replies.delivery = () => problem(503, 'INTERNAL_ERROR', 'req_POLL')
    // The moving delivery polls every 3 s.
    expect(
      await within(sheet).findByText(
        'Could not refresh. What you see may be out of date.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(6)
  }, 10_000)
})

describe('useRetryableDeadCount', () => {
  it('counts dead deliveries on active endpoints only', async () => {
    replies.endpoints = () => ({
      status: 200,
      body: {
        data: [
          endpoint('wep_on', 'ACTIVE'),
          endpoint('wep_off', 'DISABLED'),
          endpoint('wep_clean', 'ACTIVE'),
        ],
      },
    })
    replies.deadCount = (endpointId) => ({ wep_on: 2, wep_off: 7, wep_clean: 0 })[endpointId ?? ''] ?? 9
    const { result } = renderHook(() => useRetryableDeadCount(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.count).toBe(2)
    expect(result.current.endpointIds).toEqual(['wep_on'])
    // A disabled endpoint's dead deliveries are never asked for.
    expect(requests().filter((r) => r.includes('webhook-deliveries'))).toHaveLength(2)
  })
})
