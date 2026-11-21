import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { configureHttp } from '@/lib/api/http'
import type { ApiKey } from '../api'
import { ApiKeysPage } from './ApiKeysPage'

const now = new Date().toISOString()
const SECRET = 'fp_test_SECRET_shown_once_1234567890'
let keys: ApiKey[]
type Reply = { status: number; body?: unknown }
let revokeReply: () => Reply

const json = ({ status, body }: Reply) =>
  status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
      })
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), 'http://localhost')
  const method = init?.method ?? 'GET'
  if (method === 'POST') {
    const { name } = JSON.parse(String(init?.body)) as { name: string }
    const created = { id: 'key_new', name, prefix: 'fp_test_SEC', status: 'ACTIVE' as const, createdAt: now }
    keys = [created, ...keys]
    return json({ status: 201, body: { data: { ...created, key: SECRET } } })
  }
  if (method === 'DELETE') {
    const reply = revokeReply()
    if (reply.status === 204) {
      const id = url.pathname.split('/').pop()
      keys = keys.map((k) => (k.id === id ? { ...k, status: 'REVOKED' } : k))
    }
    return json(reply)
  }
  return json({ status: 200, body: { data: keys } })
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
        <MemoryRouter>
          <ApiKeysPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}
/** Rows behind an open dialog are outside the accessibility tree, so include hidden ones. */
const rowOf = (name: string) => screen.getByRole('row', { name: new RegExp(name), hidden: true })

beforeEach(() => {
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    onSessionExpired: () => {},
  })
  sessionStorage.clear()
  keys = [{ id: 'key_1', name: 'Checkout service', prefix: 'fp_test_AAA', status: 'ACTIVE', createdAt: now }]
  revokeReply = () => ({ status: 204 })
})

afterEach(() => vi.unstubAllGlobals())

describe('ApiKeysPage', () => {
  it('checks the name before asking the server', async () => {
    const user = renderPage()
    await user.click(await screen.findByRole('button', { name: 'Create key' }))
    const dialog = screen.getByRole('dialog', { name: 'Create API key' })
    await user.type(within(dialog).getByLabelText('Name'), '   ')
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }))
    expect(await within(dialog).findByText('Required.')).toBeInTheDocument()
    expect(requests()).not.toContain('POST /api/v1/merchant/api-keys')
  })

  it('shows the new key once, keeps it through Escape, and forgets it when dismissed', async () => {
    const user = renderPage()
    await user.click(await screen.findByRole('button', { name: 'Create key' }))
    const form = screen.getByRole('dialog', { name: 'Create API key' })
    await user.type(within(form).getByLabelText('Name'), '  Reporting job  ')
    await user.click(within(form).getByRole('button', { name: 'Create key' }))

    const reveal = await screen.findByRole('dialog', { name: 'Copy your new key' })
    // The name is sent trimmed.
    expect(JSON.parse(String(fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')![1]!.body))).toEqual({
      name: 'Reporting job',
    })
    await user.click(within(reveal).getByRole('button', { name: 'Show' }))
    expect(within(reveal).getByText(SECRET)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Copy your new key' })).toBeInTheDocument()

    await user.click(within(reveal).getByRole('button', { name: 'I’ve stored it' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.body.textContent).not.toContain(SECRET)
    expect(await screen.findByRole('row', { name: /Reporting job/ })).toBeInTheDocument()
  })

  it('revokes after confirmation and says what happens to callers', async () => {
    const user = renderPage()
    await user.click(
      await within(await screen.findByRole('row', { name: /Checkout service/ })).findByRole('button', {
        name: 'Revoke',
      }),
    )
    const confirm = screen.getByRole('alertdialog', { name: 'Revoke “Checkout service”?' })
    expect(within(confirm).getByText(/401 API_KEY_REVOKED/)).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Revoke key' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(requests()).toContain('DELETE /api/v1/merchant/api-keys/key_1')
    expect(within(rowOf('Checkout service')).getByText('Revoked')).toBeInTheDocument()
    expect(
      within(rowOf('Checkout service')).queryByRole('button', { name: 'Revoke' }),
    ).not.toBeInTheDocument()
  })

  it('rolls the row back and keeps a refused revoke in its dialog', async () => {
    let release: () => void = () => {}
    const pending = new Promise<void>((resolve) => (release = resolve))
    revokeReply = () => ({
      status: 503,
      body: { status: 503, code: 'INTERNAL_ERROR', title: 'x', requestId: 'req_REVOKE' },
    })
    const user = renderPage()
    await user.click(
      await within(await screen.findByRole('row', { name: /Checkout service/ })).findByRole('button', {
        name: 'Revoke',
      }),
    )
    const confirm = screen.getByRole('alertdialog')

    // Hold the DELETE to see the optimistic row first.
    const original = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, init) => {
      if (init?.method === 'DELETE') await pending
      return original(input, init)
    })
    await user.click(within(confirm).getByRole('button', { name: 'Revoke key' }))
    await waitFor(() => expect(within(rowOf('Checkout service')).getByText('Revoked')).toBeInTheDocument())

    release()
    expect(await within(confirm).findByTitle('req_REVOKE')).toBeInTheDocument()
    expect(within(rowOf('Checkout service')).getByText('Active')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    fetchMock.mockImplementation(original)
  })
})
