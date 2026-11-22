import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth'
import { configureHttp } from '@/lib/api/http'
import { SettingsPage } from './SettingsPage'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const now = new Date().toISOString()
let merchant = { id: 'mrc_1', name: 'ABC Store', status: 'ACTIVE', createdAt: now }
type Reply = { status: number; body: unknown }
let patchReply: () => Reply
const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
  const reply: Reply = init?.method === 'PATCH' ? patchReply() : { status: 200, body: { data: merchant } }
  return new Response(JSON.stringify(reply.body), {
    status: reply.status,
    headers: { 'Content-Type': reply.status >= 400 ? 'application/problem+json' : 'application/json' },
  })
})
const patches = () =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PATCH')
    .map(([, init]) => JSON.parse(String(init?.body)))

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}
const nameInput = () => screen.getByLabelText('Business name')
async function saveName(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.clear(await screen.findByLabelText('Business name'))
  await user.type(nameInput(), value)
  await user.click(screen.getByRole('button', { name: 'Save' }))
}

beforeEach(() => {
  merchant = { id: 'mrc_1', name: 'ABC Store', status: 'ACTIVE', createdAt: now }
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    onSessionExpired: () => {},
  })
  patchReply = () => {
    merchant = { ...merchant, name: 'New Name' }
    return { status: 200, body: { data: merchant } }
  }
  useSession.setState({
    status: 'authenticated',
    accessToken: 'token',
    user: { id: 'usr_1', email: 'owner@abc.store', merchantId: 'mrc_1', role: 'FINANCE' },
    expiresAt: Date.now() + 900_000,
    issuedAt: Date.now(),
    ended: null,
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('SettingsPage', () => {
  it('saves the business name trimmed', async () => {
    const user = renderPage()
    await saveName(user, '  New Name  ')
    await waitFor(() => expect(patches()).toEqual([{ name: 'New Name' }]))
  })

  it('requires a name before saving', async () => {
    const user = renderPage()
    await user.clear(await screen.findByLabelText('Business name'))
    expect(screen.getByText('Required.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('shows a rejected name on the field', async () => {
    patchReply = () => ({
      status: 400,
      body: {
        status: 400,
        code: 'VALIDATION_ERROR',
        title: 'x',
        requestId: 'req_NAME',
        errors: [{ field: 'name', code: 'Size', message: 'Merchant name must not exceed 200 characters.' }],
      },
    })
    const user = renderPage()
    await saveName(user, 'X')
    expect(await screen.findByText('Merchant name must not exceed 200 characters.')).toBeInTheDocument()
    expect(screen.queryByTitle('req_NAME')).not.toBeInTheDocument()
  })

  it('keeps any other failure with its request ID', async () => {
    patchReply = () => ({
      status: 503,
      body: { status: 503, code: 'INTERNAL_ERROR', title: 'x', requestId: 'req_SAVE' },
    })
    const user = renderPage()
    await saveName(user, 'New Name')
    expect(await screen.findByTitle('req_SAVE')).toBeInTheDocument()
  })

  it('names the role in words', async () => {
    renderPage()
    const account = screen.getByRole('heading', { name: 'Your account' }).closest('section')!
    expect(within(account).getByText('Finance')).toBeInTheDocument()
    expect(within(account).getByText('owner@abc.store')).toBeInTheDocument()
  })
})
