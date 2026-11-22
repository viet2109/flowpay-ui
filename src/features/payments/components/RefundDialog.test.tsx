import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { configureHttp } from '@/lib/api/http'
import type { PaymentIntent } from '../types'
import { useReasonLabel } from '../refund-reasons'
import { RefundDialog } from './RefundDialog'

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
const payment: PaymentIntent = {
  id: 'pi_1',
  orderId: 'ORD-1',
  description: null,
  amount: 500000,
  currency: 'VND',
  status: 'SUCCEEDED',
  refundedAmount: 0,
  refundableAmount: 500000,
  createdAt: now,
  updatedAt: now,
}
const refund = (status: string, failureCode: string | null = null) => ({
  id: 're_1',
  paymentId: 'pi_1',
  amount: 100000,
  currency: 'VND',
  status,
  reason: 'CUSTOMER_REQUEST',
  provider: 'SIMULATOR',
  providerRefundId: null,
  failureCode,
  failureMessage: failureCode ? 'The provider declined the refund.' : null,
  createdAt: now,
  updatedAt: now,
  completedAt: status === 'PROCESSING' ? null : now,
})
type Reply = { status: number; body?: unknown; headers?: Record<string, string> }
let reply: () => Reply
const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
  const r = reply()
  return new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: {
      'Content-Type': r.status >= 400 ? 'application/problem+json' : 'application/json',
      ...r.headers,
    },
  })
})
const posts = () =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(([, init]) => ({
      key: new Headers(init?.headers).get('Idempotency-Key'),
      body: JSON.parse(String(init?.body)) as { amount: number; reason?: string },
    }))

/** The dialog with an "Open" button, as the payment page uses it. */
/** What the page's next read of the payment returns ("Page refetched"). */
let refetched: PaymentIntent = payment

function Harness() {
  const [open, setOpen] = useState(true)
  const [current, setCurrent] = useState(payment)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open refund
      </button>
      <button type="button" onClick={() => setCurrent(refetched)}>
        Page refetched
      </button>
      <RefundDialog payment={current} open={open} onOpenChange={setOpen} />
    </>
  )
}

function renderDialog() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <Harness />
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}
const dialog = () => screen.getByRole('dialog', { name: 'Refund payment' })
async function refundAmount(user: ReturnType<typeof userEvent.setup>, amount: string) {
  const amountInput = within(dialog()).getByLabelText('Amount')
  await user.clear(amountInput)
  await user.type(amountInput, amount)
  await user.click(within(dialog()).getByRole('button', { name: /^Refund/ }))
}

beforeEach(() => {
  refetched = payment
  toasts.calls = []
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  configureHttp({
    getAccessToken: () => 'token',
    refreshAccessToken: () => Promise.reject(new Error('no refresh in tests')),
    onSessionExpired: () => {},
  })
  reply = () => ({ status: 201, body: { data: refund('SUCCEEDED') } })
})

afterEach(() => vi.unstubAllGlobals())

describe('RefundDialog', () => {
  it('starts at the full refundable amount and names it on the button', () => {
    renderDialog()
    expect(within(dialog()).getByLabelText('Amount')).toHaveValue('500000')
    expect(within(dialog()).getByRole('button', { name: 'Refund 500,000 VND' })).toBeInTheDocument()
  })

  it('refuses more than the refundable amount without asking the server', async () => {
    const user = renderDialog()
    await refundAmount(user, '500001')
    expect(await within(dialog()).findByText('At most 500,000 VND can be refunded.')).toBeInTheDocument()
    expect(posts()).toHaveLength(0)
  })

  it('gives two identical refunds made on purpose two keys, so the second is not a replay', async () => {
    const user = renderDialog()
    await refundAmount(user, '100000')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Open refund' }))
    await refundAmount(user, '100000')
    await waitFor(() => expect(posts()).toHaveLength(2))
    const [first, second] = posts()
    expect(second!.body).toEqual(first!.body)
    expect(second!.key).not.toBe(first!.key)
  })

  it('resends a failed attempt with the same key', async () => {
    let attempts = 0
    reply = () =>
      ++attempts === 1
        ? { status: 503, body: { status: 503, code: 'INTERNAL_ERROR', title: 'x', requestId: 'req_REFUND' } }
        : { status: 201, body: { data: refund('SUCCEEDED') } }
    const user = renderDialog()
    await refundAmount(user, '100000')
    expect(await within(dialog()).findByTitle('req_REFUND')).toBeInTheDocument()
    await user.click(within(dialog()).getByRole('button', { name: /^Refund/ }))
    await waitFor(() => expect(posts()).toHaveLength(2))
    expect(posts()[1]!.key).toBe(posts()[0]!.key)
  })

  it('keeps a capacity conflict on screen and states the new limit once the payment is read again', async () => {
    reply = () => ({
      status: 409,
      body: { status: 409, code: 'REFUND_AMOUNT_EXCEEDS_AVAILABLE', title: 'x', requestId: 'req_TAKEN' },
    })
    const user = renderDialog()
    await refundAmount(user, '100000')
    expect(await within(dialog()).findByTitle('req_TAKEN')).toBeInTheDocument()

    // Another refund took 460,000 VND; the page's refetch brings the new limit.
    refetched = { ...payment, refundedAmount: 460000, refundableAmount: 40000 }
    // The dialog is modal: the page behind it is outside the accessibility tree.
    fireEvent.click(screen.getByRole('button', { name: 'Page refetched', hidden: true }))
    expect(
      within(dialog()).getByText(
        'Another refund used part of the refundable amount meanwhile. Up to 40,000 VND can be refunded now.',
      ),
    ).toBeInTheDocument()
    // Same dialog, same typed amount, now checked against the new limit.
    expect(within(dialog()).getByLabelText('Amount')).toHaveValue('100000')
    expect(within(dialog()).getByText('At most 40,000 VND can be refunded.')).toBeInTheDocument()
  })

  it('opens at the refundable amount of the moment', async () => {
    const user = renderDialog()
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    refetched = { ...payment, refundedAmount: 300000, refundableAmount: 200000 }
    await user.click(screen.getByRole('button', { name: 'Page refetched' }))
    await user.click(screen.getByRole('button', { name: 'Open refund' }))
    expect(within(dialog()).getByLabelText('Amount')).toHaveValue('200000')
  })

  it('explains a request still in progress and retries it with the same key', async () => {
    let attempts = 0
    reply = () =>
      ++attempts === 1
        ? {
            status: 409,
            body: { status: 409, code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS', title: 'x', requestId: 'req_BUSY' },
          }
        : { status: 201, body: { data: refund('SUCCEEDED') }, headers: { 'Idempotency-Replayed': 'true' } }
    const user = renderDialog()
    await refundAmount(user, '100000')
    expect(
      await within(dialog()).findByText('The same request is still being processed. Try again in a moment.'),
    ).toBeInTheDocument()
    await user.click(within(dialog()).getByRole('button', { name: /^Refund/ }))
    await waitFor(() => expect(posts()).toHaveLength(2))
    expect(posts()[1]!.key).toBe(posts()[0]!.key)
    await waitFor(() => expect(toasts.calls).toHaveLength(1))
    expect(toasts.calls[0]!.description).toMatch(/no second one was made/)
  })

  it.each([
    ['SUCCEEDED', null, 'success', 'Refunded 100,000 VND'],
    ['FAILED', 'REFUND_DECLINED', 'error', 'Refund failed · 100,000 VND'],
    ['PROCESSING', null, 'warning', 'Refund outcome unknown'],
  ])('reports a %s refund', async (status, code, kind, title) => {
    reply = () => ({ status: status === 'PROCESSING' ? 202 : 201, body: { data: refund(status, code) } })
    const user = renderDialog()
    await refundAmount(user, '100000')
    await waitFor(() => expect(toasts.calls).toHaveLength(1))
    expect(toasts.calls[0]).toMatchObject({ kind, title })
  })

  it('names a refund replay', async () => {
    reply = () => ({
      status: 201,
      body: { data: refund('SUCCEEDED') },
      headers: { 'Idempotency-Replayed': 'true' },
    })
    const user = renderDialog()
    await refundAmount(user, '100000')
    await waitFor(() => expect(toasts.calls).toHaveLength(1))
    expect(toasts.calls[0]!.description).toMatch(/no second one was made/)
  })

  it('sends a chosen reason code, or the trimmed text written under Other', async () => {
    const user = renderDialog()
    await user.selectOptions(within(dialog()).getByLabelText('Reason'), 'OTHER')
    await user.type(within(dialog()).getByLabelText('Describe the reason'), '  Damaged in transit  ')
    await refundAmount(user, '100000')
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0]!.body).toEqual({ amount: 100000, reason: 'Damaged in transit' })
  })
})

describe('useReasonLabel', () => {
  function Label({ reason }: { reason: string | null }) {
    return <span data-testid="label">{useReasonLabel()(reason) ?? 'none'}</span>
  }

  it('translates this dashboard’s codes and shows any other text exactly as stored', () => {
    const { rerender } = render(<Label reason="DUPLICATE" />)
    expect(screen.getByTestId('label')).toHaveTextContent('Duplicate charge')
    rerender(<Label reason="Refund for ORD-12.A_b" />)
    expect(screen.getByTestId('label')).toHaveTextContent('Refund for ORD-12.A_b')
    rerender(<Label reason={null} />)
    expect(screen.getByTestId('label')).toHaveTextContent('none')
  })
})
