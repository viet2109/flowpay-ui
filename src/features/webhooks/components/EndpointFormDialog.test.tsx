import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n'
import { configureHttp } from '@/lib/api/http'
import type { WebhookEndpoint } from '../types'
import { EndpointFormDialog } from './EndpointFormDialog'

const now = new Date().toISOString()
const endpoint: WebhookEndpoint = {
  id: 'wep_1',
  url: 'https://abc.store/hooks/flowpay',
  status: 'ACTIVE',
  events: ['payment.succeeded'],
  createdAt: now,
  updatedAt: now,
}

type Reply = { status: number; body: unknown }
let reply: Reply
const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
  const headers = { 'Content-Type': reply.status >= 400 ? 'application/problem+json' : 'application/json' }
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers })
})
const sent = () => fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), init }))
const sentBody = () => JSON.parse(String(sent()[0]?.init?.body)) as unknown

function open(props: { endpoint?: WebhookEndpoint; onOpenChange?: (open: boolean) => void } = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <EndpointFormDialog open onOpenChange={props.onOpenChange ?? (() => {})} endpoint={props.endpoint} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  // No timer between keystrokes: typing whole URLs stays fast when the suite runs in parallel.
  return userEvent.setup({ delay: null })
}

const urlInput = () => screen.getByLabelText('Endpoint URL')

beforeEach(() => {
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    getMerchantKey: () => null,
    onSessionExpired: () => {},
  })
})

describe('EndpointFormDialog', () => {
  it('validates on submit and sends nothing while invalid', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: 'Add endpoint' }))
    expect(await screen.findByText('Enter the URL that will receive events.')).toBeInTheDocument()
    expect(urlInput()).toHaveAttribute('aria-invalid', 'true')

    await user.type(urlInput(), 'ftp://abc.store/hooks')
    expect(await screen.findByText('Use an https:// URL.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Select all' }))
    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(await screen.findByText('Choose at least one event.')).toBeInTheDocument()
    expect(screen.getByText('0 of 6 selected')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates the endpoint and reveals the signing secret once', async () => {
    reply = { status: 201, body: { data: { ...endpoint, secret: 'whsec_test' } } }
    const user = open()
    await user.type(urlInput(), '  https://abc.store/hooks/flowpay  ')
    await user.click(screen.getByRole('button', { name: 'Add endpoint' }))

    expect(await screen.findByText('Endpoint created')).toBeInTheDocument()
    expect(sentBody()).toEqual({
      url: 'https://abc.store/hooks/flowpay',
      events: ['payment.succeeded', 'payment.failed', 'refund.succeeded', 'refund.failed'],
    })
  })

  it('puts a server field error on its field', async () => {
    reply = {
      status: 400,
      body: {
        status: 400,
        code: 'VALIDATION_ERROR',
        requestId: 'req_1',
        errors: [{ field: 'url', message: 'Must not resolve to a private address.' }],
      },
    }
    const user = open()
    await user.type(urlInput(), 'https://10.0.0.1/hooks')
    await user.click(screen.getByRole('button', { name: 'Add endpoint' }))

    expect(await screen.findByText('Must not resolve to a private address.')).toBeInTheDocument()
    expect(urlInput()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a URL-policy rejection (no field list, F10) on the URL field', async () => {
    reply = { status: 400, body: { status: 400, code: 'VALIDATION_ERROR', requestId: 'req_2' } }
    const user = open()
    await user.type(urlInput(), 'https://10.0.0.5/hooks')
    await user.click(screen.getByRole('button', { name: 'Add endpoint' }))

    expect(
      await screen.findByText(
        'FlowPay will not send to this address. Use a public URL; private, local and metadata addresses are rejected.',
      ),
    ).toBeInTheDocument()
    expect(urlInput()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps a rejection of an events-only edit in the callout, not on the untouched URL', async () => {
    reply = { status: 400, body: { status: 400, code: 'VALIDATION_ERROR', requestId: 'req_3' } }
    const user = open({ endpoint })
    await user.click(screen.getByRole('checkbox', { name: 'refund.failed' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(sentBody()).toEqual({ events: ['payment.succeeded', 'refund.failed'] })
    expect(urlInput()).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('shows other failures, such as a disabled endpoint, in the callout', async () => {
    reply = {
      status: 409,
      body: {
        status: 409,
        code: 'WEBHOOK_INVALID_STATE',
        title: 'Webhook invalid state',
        requestId: 'req_4',
      },
    }
    const user = open({ endpoint })
    await user.clear(urlInput())
    await user.type(urlInput(), 'https://abc.store/v3')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(urlInput()).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('reads in Vietnamese, event names stay as code', async () => {
    await i18n.changeLanguage('vi')
    try {
      open({ endpoint })
      expect(await screen.findByRole('dialog', { name: 'Sửa endpoint' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Thanh toán' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Thành công' })).toBeInTheDocument()
      expect(screen.getByText('Đã chọn 1/6')).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'payment.succeeded' })).toBeChecked()
      expect(screen.getByLabelText('URL của endpoint')).toHaveValue(endpoint.url)
    } finally {
      await i18n.changeLanguage('en')
    }
  })

  it('closes an unchanged edit without a request and patches only what changed', async () => {
    const onOpenChange = vi.fn()
    const user = open({ endpoint, onOpenChange })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(fetchMock).not.toHaveBeenCalled()

    reply = { status: 200, body: { data: { ...endpoint, url: 'https://abc.store/v2' } } }
    await user.clear(urlInput())
    await user.type(urlInput(), 'https://abc.store/v2')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sent()[0]?.init?.method).toBe('PATCH')
    expect(sentBody()).toEqual({ url: 'https://abc.store/v2' })
  })
})
