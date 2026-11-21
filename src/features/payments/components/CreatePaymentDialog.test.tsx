import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { configureHttp } from '@/lib/api/http'
import { CreatePaymentDialog } from './CreatePaymentDialog'

const toasts = vi.hoisted(() => ({ calls: [] as { kind: string; title: string; description?: string }[] }))
vi.mock('sonner', () => {
  const record = (kind: string) => (title: string, options?: { description?: string }) =>
    toasts.calls.push({ kind, title, description: options?.description })
  return {
    toast: Object.assign(record('default'), {
      success: record('success'),
      error: record('error'),
      warning: record('warning'),
    }),
  }
})

const now = new Date().toISOString()
type Reply = { status: number; body?: unknown; headers?: Record<string, string> }
let createReply: () => Reply
let confirmReply: () => Reply
const created = {
  id: 'pi_new',
  orderId: 'ORD-1',
  description: null,
  amount: 500000,
  currency: 'VND',
  status: 'CREATED',
  refundedAmount: 0,
  refundableAmount: 0,
  createdAt: now,
}
const confirmed = (paymentStatus: string, failureCode: string | null = null) => ({
  paymentId: 'pi_new',
  paymentStatus,
  transactionId: 'ptxn_1',
  transactionStatus: paymentStatus === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED',
  provider: 'SIMULATOR',
  providerTransactionId: null,
  failureCode,
  failureMessage: failureCode ? 'The provider is unavailable.' : null,
})
const problem = (status: number, code: string, requestId: string): Reply => ({
  status,
  body: { status, code, title: code, requestId },
})

const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
  const path = new URL(String(input), 'http://localhost').pathname
  const reply = path.endsWith('/confirm') ? confirmReply() : createReply()
  return new Response(JSON.stringify(reply.body), {
    status: reply.status,
    headers: {
      'Content-Type': reply.status >= 400 ? 'application/problem+json' : 'application/json',
      ...reply.headers,
    },
  })
})
const sent = (suffix: string) =>
  fetchMock.mock.calls
    .filter(([input]) => new URL(String(input), 'http://x').pathname.endsWith(suffix))
    .map(([, init]) => new Headers(init?.headers).get('Idempotency-Key'))

function renderDialog() {
  const onOpenChange = vi.fn()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter>
          <CreatePaymentDialog open onOpenChange={onOpenChange} />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return { user: userEvent.setup({ delay: null }), onOpenChange }
}

async function submit(user: ReturnType<typeof userEvent.setup>, amount = '500000') {
  const dialog = screen.getByRole('dialog', { name: 'New test payment' })
  await user.clear(within(dialog).getByLabelText('Amount'))
  await user.type(within(dialog).getByLabelText('Amount'), amount)
  await user.click(within(dialog).getByRole('button', { name: 'Create payment' }))
  return dialog
}

beforeEach(() => {
  toasts.calls = []
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    onSessionExpired: () => {},
  })
  createReply = () => ({ status: 201, body: { data: created } })
  confirmReply = () => ({ status: 200, body: { data: confirmed('SUCCEEDED') } })
})

afterEach(() => vi.unstubAllGlobals())

describe('CreatePaymentDialog', () => {
  it('creates and confirms, then says the payment succeeded', async () => {
    const { user, onOpenChange } = renderDialog()
    await submit(user)
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(sent('/merchant/payments')).toHaveLength(1)
    expect(sent('/confirm')).toHaveLength(1)
    expect(toasts.calls).toEqual([
      { kind: 'success', title: 'Payment succeeded · 500,000 VND', description: undefined },
    ])
  })

  it('keeps a created payment visible when confirming fails, and retries with the same key only', async () => {
    let confirmAttempts = 0
    confirmReply = () =>
      ++confirmAttempts === 1
        ? problem(503, 'INTERNAL_ERROR', 'req_CONFIRM')
        : { status: 200, body: { data: confirmed('SUCCEEDED') } }
    const { user, onOpenChange } = renderDialog()
    const dialog = await submit(user)

    expect(await within(dialog).findByText('Payment created, but not confirmed')).toBeInTheDocument()
    expect(within(dialog).getByTitle('pi_new')).toBeInTheDocument()
    expect(within(dialog).getByTitle('req_CONFIRM')).toBeInTheDocument()
    // The form is gone: changing a value now would mean a second payment.
    expect(within(dialog).queryByLabelText('Amount')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Retry confirmation' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    const confirmKeys = sent('/confirm')
    expect(confirmKeys).toHaveLength(2)
    expect(confirmKeys[1]).toBe(confirmKeys[0])
    expect(sent('/merchant/payments')).toHaveLength(1)
  })

  it('sends the same create key again after a failed attempt with the same values', async () => {
    let createAttempts = 0
    createReply = () =>
      ++createAttempts === 1
        ? problem(503, 'INTERNAL_ERROR', 'req_CREATE')
        : { status: 201, body: { data: created } }
    const { user } = renderDialog()
    const dialog = await submit(user)
    expect(await within(dialog).findByTitle('req_CREATE')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Create payment' }))
    await waitFor(() => expect(sent('/merchant/payments')).toHaveLength(2))
    const [first, second] = sent('/merchant/payments')
    expect(second).toBe(first)
  })

  it('says a create replay made no second payment', async () => {
    createReply = () => ({
      status: 201,
      body: { data: created },
      headers: { 'Idempotency-Replayed': 'true' },
    })
    const { user } = renderDialog()
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox'))
    await submit(user)
    await waitFor(() => expect(toasts.calls).toHaveLength(1))
    expect(toasts.calls[0]).toMatchObject({ kind: 'default', title: 'Payment created · 500,000 VND' })
    expect(toasts.calls[0]!.description).toMatch(/no second one was made/)
  })

  it('calls a failed payment failed, with its code, never declined', async () => {
    confirmReply = () => ({ status: 200, body: { data: confirmed('FAILED', 'PROVIDER_UNAVAILABLE') } })
    const { user } = renderDialog()
    await submit(user)
    await waitFor(() => expect(toasts.calls).toHaveLength(1))
    expect(toasts.calls[0]).toMatchObject({ kind: 'error', title: 'Payment failed · 500,000 VND' })
    expect(toasts.calls[0]!.description).toContain('PROVIDER_UNAVAILABLE')
    expect(JSON.stringify(toasts.calls)).not.toMatch(/declined/i)
  })

  it('reports an unknown provider outcome as unknown', async () => {
    confirmReply = () => ({
      status: 202,
      body: { data: { ...confirmed('PROCESSING'), transactionStatus: 'UNKNOWN' } },
    })
    const { user } = renderDialog()
    await submit(user)
    await waitFor(() => expect(toasts.calls).toHaveLength(1))
    expect(toasts.calls[0]).toMatchObject({ kind: 'warning', title: 'Provider outcome unknown' })
  })
})
