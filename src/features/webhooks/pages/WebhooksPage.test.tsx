import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { i18n } from '@/i18n'
import { configureHttp } from '@/lib/api/http'
import type { WebhookDelivery, WebhookEndpoint } from '../types'
import { WebhooksPage } from './WebhooksPage'

const now = new Date().toISOString()
const endpoint = (id: string, status: WebhookEndpoint['status'], host: string): WebhookEndpoint => ({
  id,
  url: `https://${host}/hooks/flowpay`,
  status,
  events: ['payment.succeeded', 'refund.succeeded'],
  createdAt: now,
  updatedAt: now,
})
const delivery = (overrides: Partial<WebhookDelivery>): WebhookDelivery => ({
  id: 'wdl_1',
  endpointId: 'wep_active',
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
  ...overrides,
})
const page = (items: WebhookDelivery[], totalElements = items.length) => ({
  data: items,
  meta: { page: 0, size: 1, totalElements, totalPages: totalElements, hasNext: false, hasPrevious: false },
})

/** Replies per request; a test overrides `deliveries` to shape each endpoint's health. */
let endpoints: WebhookEndpoint[]
let deliveries: (query: URLSearchParams) => { status: number; body: unknown }
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), 'http://localhost')
  const reply = url.pathname.endsWith('/merchant/webhook-endpoints')
    ? { status: 200, body: { data: endpoints } }
    : deliveries(url.searchParams)
  const headers = { 'Content-Type': reply.status >= 400 ? 'application/problem+json' : 'application/json' }
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers })
})
const deliveryRequests = () =>
  fetchMock.mock.calls
    .map(([input]) => new URL(String(input), 'http://localhost'))
    .filter((url) => url.pathname.endsWith('/merchant/webhook-deliveries'))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter>
          <WebhooksPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

const row = async (host: string) => (await screen.findByTitle(`https://${host}/hooks/flowpay`)).closest('li')!

beforeEach(() => {
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    getMerchantKey: () => null,
    onSessionExpired: () => {},
  })
  endpoints = [
    endpoint('wep_active', 'ACTIVE', 'shop.example'),
    endpoint('wep_off', 'DISABLED', 'old.example'),
  ]
  deliveries = (query) => {
    if (query.get('status') === 'DEAD') return { status: 200, body: page([], 2) }
    if (query.get('status') === 'RETRYING') return { status: 200, body: page([], 1) }
    return { status: 200, body: page([delivery({})]) }
  }
})

afterEach(() => vi.unstubAllGlobals())

describe('WebhooksPage', () => {
  it('shows the latest delivery and links the deliveries that need action', async () => {
    renderPage()
    const active = within(await row('shop.example'))

    expect(await active.findByText('HTTP 204')).toBeInTheDocument()
    expect(active.getByText('Delivered')).toBeInTheDocument()
    expect(active.getByText(/Last delivery/)).toBeInTheDocument()
    expect(active.getByText('2 events')).toBeInTheDocument()
    expect(active.getByRole('link', { name: '2 dead deliveries to retry' })).toHaveAttribute(
      'href',
      '/developers/webhooks/deliveries?endpointId=wep_active&status=DEAD',
    )
    expect(active.getByRole('link', { name: '1 retrying' })).toHaveAttribute(
      'href',
      '/developers/webhooks/deliveries?endpointId=wep_active&status=RETRYING',
    )
    expect(active.getByRole('link', { name: 'https://shop.example/hooks/flowpay' })).toHaveAttribute(
      'href',
      '/developers/webhooks/wep_active',
    )
  })

  it('asks nothing about a disabled endpoint, whose dead deliveries cannot be retried', async () => {
    renderPage()
    const disabled = within(await row('old.example'))
    expect(disabled.getByText('Receives no events')).toBeInTheDocument()
    await within(await row('shop.example')).findByText('HTTP 204')

    expect(deliveryRequests().every((url) => url.searchParams.get('endpointId') === 'wep_active')).toBe(true)
    expect(deliveryRequests()).toHaveLength(3)
  })

  it('says why the latest delivery got no HTTP status', async () => {
    deliveries = (query) =>
      query.get('status')
        ? { status: 200, body: page([], 0) }
        : {
            status: 200,
            body: page([
              delivery({
                status: 'RETRYING',
                lastHttpStatus: null,
                lastError: 'TRANSPORT_FAILURE',
                deliveredAt: null,
              }),
            ]),
          }
    renderPage()
    const active = within(await row('shop.example'))

    expect(await active.findByText('TRANSPORT_FAILURE')).toBeInTheDocument()
    expect(active.getByText('Retrying')).toBeInTheDocument()
  })

  it('says when an endpoint has no deliveries and nothing needs action', async () => {
    deliveries = () => ({ status: 200, body: page([]) })
    renderPage()
    const active = within(await row('shop.example'))

    expect(await active.findByText('No deliveries yet')).toBeInTheDocument()
    expect(active.queryByText(/dead|retrying/)).not.toBeInTheDocument()
  })

  it('shows a failed health check with its request ID and retries it', async () => {
    let failing = true
    deliveries = (query) =>
      failing
        ? {
            status: 500,
            body: {
              status: 500,
              code: 'INTERNAL_ERROR',
              title: 'Internal server error',
              requestId: 'req_01HEALTH',
            },
          }
        : { status: 200, body: page(query.get('status') ? [] : [delivery({})], 0) }
    renderPage()
    const active = within(await row('shop.example'))

    expect(await active.findByText('Delivery health unavailable')).toBeInTheDocument()
    expect(active.getByTitle('req_01HEALTH')).toBeInTheDocument()

    failing = false
    await userEvent.setup().click(active.getByRole('button', { name: 'Try again' }))
    expect(await active.findByText('HTTP 204')).toBeInTheDocument()
  })

  it('reads in Vietnamese', async () => {
    await i18n.changeLanguage('vi')
    try {
      renderPage()
      const active = within(await row('shop.example'))
      expect(await screen.findByRole('heading', { level: 1, name: 'Webhook' })).toBeInTheDocument()
      expect(await active.findByText('2 lượt gửi hết lượt thử, có thể gửi lại')).toBeInTheDocument()
      expect(active.getByText('1 lượt gửi đang thử lại')).toBeInTheDocument()
      expect(within(await row('old.example')).getByText('Không còn nhận sự kiện')).toBeInTheDocument()
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})
