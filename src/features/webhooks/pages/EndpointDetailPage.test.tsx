import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { configureHttp } from '@/lib/api/http'
import type { WebhookEndpoint } from '../types'
import { EndpointDetailPage } from './EndpointDetailPage'

const now = new Date().toISOString()
let endpoint: WebhookEndpoint
const emptyPage = (totalElements = 0) => ({
  data: [],
  meta: { page: 0, size: 20, totalElements, totalPages: 0, hasNext: false, hasPrevious: false },
})

type Reply = { status: number; body?: unknown }
/** Per-request replies; tests override rotate/disable and the cancellable counts. */
let replies: { rotate: () => Reply; disable: () => Reply; count: (status: string) => number }
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), 'http://localhost')
  const method = init?.method ?? 'GET'
  let reply: Reply
  if (url.pathname.endsWith('/rotate-secret')) reply = replies.rotate()
  else if (url.pathname.includes('/webhook-endpoints/') && method === 'DELETE') reply = replies.disable()
  else if (url.pathname.includes('/webhook-endpoints/')) reply = { status: 200, body: { data: endpoint } }
  else if (url.searchParams.get('size') === '1')
    reply = { status: 200, body: emptyPage(replies.count(url.searchParams.get('status') ?? '')) }
  else reply = { status: 200, body: emptyPage() }
  if (reply.status === 204) return new Response(null, { status: 204 })
  const headers = { 'Content-Type': reply.status >= 400 ? 'application/problem+json' : 'application/json' }
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers })
})
const requests = () =>
  fetchMock.mock.calls.map(
    ([input, init]) => `${init?.method ?? 'GET'} ${new URL(String(input), 'http://x').pathname}`,
  )

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/developers/webhooks/wep_1']}>
          <Routes>
            <Route path="/developers/webhooks/:endpointId" element={<EndpointDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}

async function openAction(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name: 'More actions' }))
  await user.click(await screen.findByRole('menuitem', { name }))
  return screen.findByRole('alertdialog')
}

beforeEach(() => {
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    onSessionExpired: () => {},
  })
  endpoint = {
    id: 'wep_1',
    url: 'https://abc.store/hooks/flowpay',
    status: 'ACTIVE',
    events: ['payment.succeeded'],
    createdAt: now,
    updatedAt: now,
  }
  replies = {
    rotate: () => ({
      status: 200,
      body: { data: { id: 'wep_1', secret: 'whsec_rotated_once', updatedAt: now } },
    }),
    disable: () => {
      endpoint = { ...endpoint, status: 'DISABLED' }
      return { status: 204 }
    },
    count: () => 0,
  }
})

afterEach(() => vi.unstubAllGlobals())

describe('EndpointDetailPage', () => {
  it('rotates the secret after confirmation and shows the new one only until dismissed', async () => {
    const user = renderPage()
    const confirm = await openAction(user, 'Rotate signing secret')
    expect(within(confirm).getByText(/there is no grace period/)).toBeInTheDocument()

    await user.click(within(confirm).getByRole('button', { name: 'Rotate secret' }))
    const reveal = await screen.findByRole('dialog', { name: 'New signing secret' })
    expect(requests()).toContain('POST /api/v1/merchant/webhook-endpoints/wep_1/rotate-secret')
    expect(within(reveal).getByText('Signing secret')).toBeInTheDocument()

    await user.click(within(reveal).getByRole('button', { name: 'I’ve stored it' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'New signing secret' })).not.toBeInTheDocument(),
    )
    expect(document.body.textContent).not.toContain('whsec_rotated_once')
  })

  it('keeps a failed rotation in its dialog with the request ID', async () => {
    replies.rotate = () => ({
      status: 409,
      body: {
        status: 409,
        code: 'WEBHOOK_INVALID_STATE',
        title: 'Webhook invalid state',
        requestId: 'req_ROTATE',
      },
    })
    const user = renderPage()
    const confirm = await openAction(user, 'Rotate signing secret')
    await user.click(within(confirm).getByRole('button', { name: 'Rotate secret' }))

    expect(await within(confirm).findByRole('alert')).toBeInTheDocument()
    expect(within(confirm).getByTitle('req_ROTATE')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'New signing secret' })).not.toBeInTheDocument()
  })

  it('states how many deliveries disabling cancels, then shows the endpoint as disabled', async () => {
    replies.count = (status) => (status === 'PENDING' ? 1 : status === 'RETRYING' ? 2 : 0)
    const user = renderPage()
    const confirm = await openAction(user, 'Disable endpoint')
    expect(within(confirm).getByText(/cannot be re-enabled/)).toBeInTheDocument()
    expect(
      await within(confirm).findByText('3 deliveries still waiting or retrying will be marked dead.'),
    ).toBeInTheDocument()

    await user.click(within(confirm).getByRole('button', { name: 'Disable endpoint' }))
    expect(await screen.findByText('This endpoint is disabled')).toBeInTheDocument()
    expect(requests()).toContain('DELETE /api/v1/merchant/webhook-endpoints/wep_1')
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('asks for the cancellable counts only when disabling is about to happen', async () => {
    const countRequests = () =>
      fetchMock.mock.calls.filter(
        ([input]) => new URL(String(input), 'http://x').searchParams.get('size') === '1',
      )
    const user = renderPage()
    // The deliveries list has loaded (its own page size), and no count was asked for yet.
    await waitFor(() => expect(requests()).toContain('GET /api/v1/merchant/webhook-deliveries'))
    expect(countRequests()).toHaveLength(0)

    await openAction(user, 'Disable endpoint')
    await waitFor(() => expect(countRequests()).toHaveLength(2))
  })

  it('shows the signature check the local receiver runs, with protocol names as code', async () => {
    renderPage()
    expect(await screen.findByText('Verify signatures')).toBeInTheDocument()
    expect(document.querySelector('pre code')?.textContent).toContain(
      'export function verifyFlowPaySignature(',
    )
    const codes = [...document.querySelectorAll('ol code')].map((c) => c.textContent)
    expect(codes).toEqual(
      expect.arrayContaining(['FlowPay-Signature: t=…,v1=…', 'whsec_…', 'FlowPay-Event-Id']),
    )
  })

  it('shows unsubscribed events as such, without dimming them', async () => {
    renderPage()
    expect(await screen.findByText('Provider confirmed the charge.')).toBeInTheDocument()
    expect(screen.getAllByText('Not subscribed')).toHaveLength(5)
    expect(document.querySelector('.opacity-40')).toBeNull()
  })
})
