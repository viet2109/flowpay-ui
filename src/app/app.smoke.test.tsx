import { act, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { restoreSession } from '@/features/auth'
import { useTestKey } from '@/features/test-mode'
import { App } from './App'
import { setupHttp } from './http-setup'
import { router } from './router'

/**
 * Smoke test: every route renders against a fake backend that follows
 * docs/api-contract.md. Catches runtime wiring errors that typecheck cannot.
 */
const now = new Date().toISOString()
const claims = btoa(JSON.stringify({ sub: 'usr_1', merchant: 'mrc_1', role: 'OWNER', exp: 9999999999 }))
const page = (items: unknown[]) => ({
  data: items,
  meta: { page: 0, size: 20, totalElements: items.length, totalPages: 1, hasNext: false, hasPrevious: false },
})

const payment = {
  id: 'pi_01KTEST',
  orderId: 'ORDER-1',
  description: 'Smoke',
  amount: 500000,
  currency: 'VND',
  status: 'PARTIALLY_REFUNDED',
  refundedAmount: 200000,
  refundableAmount: 300000,
  createdAt: now,
  updatedAt: now,
}
const delivery = {
  id: 'wdl_1',
  endpointId: 'wep_1',
  eventId: 'evt_1',
  eventType: 'payment.succeeded',
  resourceType: 'PAYMENT_INTENT',
  resourceId: payment.id,
  status: 'DEAD',
  attemptCount: 6,
  nextAttemptAt: null,
  deliveredAt: null,
  lastHttpStatus: 500,
  lastError: null,
  createdAt: now,
  updatedAt: now,
}
const endpoint = {
  id: 'wep_1',
  url: 'https://abc.store/hooks/flowpay',
  status: 'ACTIVE',
  events: ['payment.succeeded'],
  createdAt: now,
  updatedAt: now,
}

const routes: [RegExp, unknown][] = [
  [/\/auth\/refresh$/, { data: { accessToken: `h.${claims}.s`, expiresIn: 900 } }],
  [/\/merchant$/, { data: { id: 'mrc_1', name: 'ABC Store', status: 'ACTIVE', createdAt: now } }],
  [
    /\/merchant\/api-keys$/,
    { data: [{ id: 'key_1', name: 'Dev', prefix: 'fp_test_A7x', status: 'ACTIVE', createdAt: now }] },
  ],
  [/\/merchant\/webhook-endpoints$/, { data: [endpoint] }],
  [/\/merchant\/webhook-endpoints\/wep_1$/, { data: endpoint }],
  [/\/merchant\/webhook-deliveries(\?.*)?$/, page([delivery])],
  [/\/payment-intents\/pi_01KTEST\/transactions$/, { data: [] }],
  [/\/payment-intents\/pi_01KTEST\/refunds(\?.*)?$/, page([])],
  [/\/payment-intents\/pi_01KTEST$/, { data: payment }],
  [/\/payment-intents(\?.*)?$/, page([payment])],
]

beforeAll(async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const hit = routes.find(([pattern]) => pattern.test(url))
      return hit
        ? new Response(JSON.stringify(hit[1]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response(JSON.stringify({ status: 404, code: 'NOT_FOUND' }), { status: 404 })
    }),
  )
  setupHttp()
  useTestKey.getState().connect('fp_test_A7xSMOKE')
  await restoreSession()
})

async function visit(path: string) {
  await act(() => router.navigate(path))
}

describe('app routes', () => {
  it.each([
    ['/', 'Overview'],
    ['/payments', 'Payments'],
    ['/developers/api-keys', 'API keys'],
    ['/developers/webhooks', 'Webhooks'],
    ['/developers/webhooks/deliveries', 'Webhooks'],
    ['/settings', 'Settings'],
  ])('%s renders', async (path, heading) => {
    render(<App />)
    await visit(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('payment detail shows amount, lifecycle and refund capacity', async () => {
    render(<App />)
    await visit('/payments/pi_01KTEST')
    expect(await screen.findByText('Refund capacity')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Payment lifecycle' })).toBeInTheDocument()
    expect(screen.getAllByText('500,000').length).toBeGreaterThan(0)
  })

  it('endpoint detail lists subscribed events and deliveries', async () => {
    render(<App />)
    await visit('/developers/webhooks/wep_1')
    expect(await screen.findByText('Subscribed events')).toBeInTheDocument()
    expect(await screen.findByText('HTTP 500')).toBeInTheDocument()
  })

  it('dev UI gallery renders primitives, composites and every feature section', async () => {
    // The page and the feature sections are lazy chunks. A cold run transforms
    // them first, which takes longer than findBy's 1 s default.
    const lazyChunk = { timeout: 5_000 }
    render(<App />)
    await visit('/dev/ui')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'UI gallery' }, lazyChunk),
    ).toBeInTheDocument()
    for (const section of ['Button', 'Text fields', 'Choice', 'Callout', 'Overlays', 'Money', 'IDs and time'])
      expect(screen.getByRole('region', { name: section })).toBeInTheDocument()
    for (const section of [
      'LifecycleRail',
      'RefundCapacity',
      'RetryTrack',
      'AttemptTimeline',
      'API key statuses',
      'Merchant statuses',
    ])
      expect(await screen.findByRole('region', { name: section }, lazyChunk)).toBeInTheDocument()
  }, 15_000)

  it('unknown route shows not found', async () => {
    render(<App />)
    await visit('/nope')
    expect(await screen.findByText('This page does not exist')).toBeInTheDocument()
  })
})
