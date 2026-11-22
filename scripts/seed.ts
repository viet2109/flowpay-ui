/**
 * Seeds one merchant with data covering every dashboard state, using only the
 * public FlowPay API. Every step checks the state it expects and stops on the
 * first surprise, so a successful run proves each state is reachable.
 *
 *   npm run seed
 *
 * Needs the local stack (docs/local-stack.md): the backend's `dev` profile
 * enables simulator amount triggers (amounts ending 901/902/903 in minor units
 * force DECLINED/UNKNOWN/TECHNICAL_FAILURE) and WEBHOOK_ALLOW_INSECURE_LOCALHOST.
 *
 * Environment (all optional):
 *   SEED_API_URL        backend origin, default http://localhost:8080
 *   SEED_EMAIL          default demo+<timestamp>@example.com (a new merchant per run)
 *   SEED_PASSWORD       default FlowPay-demo-2026
 *   SEED_RECEIVER_PORT  local webhook receiver port, default 4242
 */
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { pathToFileURL } from 'node:url'

const API = (process.env.SEED_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')
const PASSWORD = process.env.SEED_PASSWORD ?? 'FlowPay-demo-2026'

export interface SeedOptions {
  /** No progress output or summary (used by the Playwright global setup). */
  quiet?: boolean
  /** 0 picks a free port. Default SEED_RECEIVER_PORT or 4242. */
  receiverPort?: number
}

export interface SeedResult {
  email: string
  password: string
  merchantName: string
  /** Raw test key of the active API key; local simulator only. */
  apiKey: string
}

let quietMode = false

type PaymentStatus = 'CREATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'PARTIALLY_REFUNDED' | 'REFUNDED'
type RefundStatus = 'CREATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'
type DeliveryStatus = 'PENDING' | 'DELIVERING' | 'DELIVERED' | 'RETRYING' | 'DEAD'

interface Payment {
  id: string
  status: PaymentStatus
  amount: number
  currency: string
  refundableAmount: number
}
interface ConfirmResult {
  paymentStatus: PaymentStatus
  transactionStatus: string
}
interface Refund {
  id: string
  status: RefundStatus
}
interface Endpoint {
  id: string
}
interface Delivery {
  id: string
  status: DeliveryStatus
  attemptCount: number
}
interface PageMeta {
  totalElements: number
}

interface CallOptions {
  token?: string
  body?: unknown
  idempotencyKey?: string
  query?: Record<string, string | number>
}

interface CallResult<T> {
  status: number
  data: T
  meta?: PageMeta
}

async function call<T>(method: string, path: string, options: CallOptions = {}): Promise<CallResult<T>> {
  const url = new URL(`${API}/api/v1${path}`)
  for (const [k, v] of Object.entries(options.query ?? {})) url.searchParams.set(k, String(v))
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
  // Every auth POST needs exactly this marker (BR-AUTH-012).
  if (path.startsWith('/auth/')) headers['X-FlowPay-CSRF'] = '1'

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new Error(`Cannot reach ${API}. Is the backend running? See docs/local-stack.md.`)
  }
  const text = await res.text()
  const json = text
    ? (JSON.parse(text) as { data?: T; meta?: PageMeta; code?: string; requestId?: string })
    : {}
  if (!res.ok) {
    throw new Error(
      `${method} ${url.pathname} -> ${res.status} ${json.code ?? ''} (requestId ${json.requestId ?? '-'})`,
    )
  }
  return { status: res.status, data: json.data as T, meta: json.meta }
}

function expect(actual: unknown, expected: unknown, what: string): void {
  if (actual !== expected) throw new Error(`${what}: expected ${String(expected)}, got ${String(actual)}`)
}

function step(message: string): void {
  if (!quietMode) console.log(`  - ${message}`)
}

async function waitFor<T>(what: string, probe: () => Promise<T | undefined>, timeoutMs = 60_000): Promise<T> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await probe()
    if (value !== undefined) return value
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Timed out waiting for ${what}`)
}

/** Local receiver: /ok acknowledges, anything else fails with 500. */
function startReceiver(port: number) {
  const counts = { ok: 0, failed: 0 }
  const server = createServer((req, res) => {
    req.resume()
    if (req.url === '/ok') {
      counts.ok += 1
      res.writeHead(200).end()
    } else {
      counts.failed += 1
      res.writeHead(500).end()
    }
  })
  /** Resolves to the port actually bound (matters when `port` is 0). */
  const ready = new Promise<number>((resolve, reject) => {
    server.once('error', (e) => reject(new Error(`Receiver port ${port}: ${e.message}`)))
    server.listen(port, () => resolve((server.address() as AddressInfo).port))
  })
  return { counts, ready, close: () => new Promise<void>((r) => server.close(() => r())) }
}

export async function seed(options: SeedOptions = {}): Promise<SeedResult> {
  quietMode = options.quiet ?? false
  const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const EMAIL = process.env.SEED_EMAIL ?? `demo+${RUN}@example.com`
  const MERCHANT = 'Cửa hàng Ánh Dương'
  if (!quietMode) console.log(`Seeding ${API}`)

  // --- Merchant and dashboard session -------------------------------------
  await call('POST', '/auth/register', {
    body: {
      email: EMAIL,
      password: PASSWORD,
      firstName: 'Ánh',
      lastName: 'Dương',
      merchantName: MERCHANT,
    },
  })
  const login = await call<{ accessToken: string }>('POST', '/auth/login', {
    body: { email: EMAIL, password: PASSWORD },
  })
  const jwt = login.data.accessToken
  step(`merchant registered: ${EMAIL}`)

  // --- API keys: one active (used below), one revoked ----------------------
  const key = await call<{ key: string }>('POST', '/merchant/api-keys', {
    token: jwt,
    body: { name: 'Order service' },
  })
  const apiKey = key.data.key
  const oldKey = await call<{ id: string }>('POST', '/merchant/api-keys', {
    token: jwt,
    body: { name: 'Old staging server' },
  })
  await call('DELETE', `/merchant/api-keys/${oldKey.data.id}`, { token: jwt })
  step('API keys: 1 active, 1 revoked')

  // --- Webhook endpoints, created before any event (subscriptions are snapshotted)
  const receiver = startReceiver(options.receiverPort ?? Number(process.env.SEED_RECEIVER_PORT ?? 4242))
  const base = `http://localhost:${await receiver.ready}`
  const healthy = await call<Endpoint>('POST', '/merchant/webhook-endpoints', {
    token: jwt,
    body: {
      url: `${base}/ok`,
      events: [
        'payment.processing',
        'payment.succeeded',
        'payment.failed',
        'refund.processing',
        'refund.succeeded',
        'refund.failed',
      ],
    },
  })
  const failing = await call<Endpoint>('POST', '/merchant/webhook-endpoints', {
    token: jwt,
    body: { url: `${base}/payments-broken`, events: ['payment.succeeded', 'payment.failed'] },
  })
  const toDisable = await call<Endpoint>('POST', '/merchant/webhook-endpoints', {
    token: jwt,
    body: { url: `${base}/refunds-retired`, events: ['refund.succeeded', 'refund.failed'] },
  })
  step('webhook endpoints: healthy, failing, to-be-disabled')

  // --- Payments ------------------------------------------------------------
  async function pay(
    orderId: string | undefined,
    amount: number,
    currency: string,
    description: string | undefined,
    expected: PaymentStatus,
    confirm = true,
  ): Promise<Payment> {
    const ref = orderId ?? `no-order-${amount}`
    const created = await call<Payment>('POST', '/payment-intents', {
      token: apiKey,
      idempotencyKey: `seed-${RUN}-${ref}-create`,
      body: { amount, currency, orderId, description },
    })
    if (confirm) {
      const confirmed = await call<ConfirmResult>('POST', `/payment-intents/${created.data.id}/confirm`, {
        token: apiKey,
        idempotencyKey: `seed-${RUN}-${ref}-confirm`,
      })
      if (expected !== 'SUCCEEDED' && confirmed.data.paymentStatus === 'SUCCEEDED') {
        throw new Error(
          'The simulator ignored the amount trigger. Start the backend with the dev profile ' +
            '(simulator amount triggers enabled); see docs/local-stack.md.',
        )
      }
      expect(confirmed.data.paymentStatus, expected, `${ref} status`)
    }
    const payment = (await call<Payment>('GET', `/payment-intents/${created.data.id}`, { token: apiKey }))
      .data
    expect(payment.status, expected, `${ref} status`)
    return payment
  }

  let refundNo = 0
  async function refund(
    payment: Payment,
    amount: number,
    reason: string | undefined,
    expected: RefundStatus,
  ) {
    refundNo += 1
    const result = await call<Refund>('POST', `/payment-intents/${payment.id}/refunds`, {
      token: apiKey,
      idempotencyKey: `seed-${RUN}-refund-${refundNo}`,
      body: { amount, reason },
    })
    expect(result.data.status, expected, `refund ${refundNo} on ${payment.id}`)
  }

  async function reload(payment: Payment, expected: PaymentStatus) {
    const fresh = (await call<Payment>('GET', `/payment-intents/${payment.id}`, { token: apiKey })).data
    expect(fresh.status, expected, `${payment.id} status after refunds`)
  }

  // Filler first, so the interesting records are on top of page 1 (newest first).
  for (let i = 1; i <= 15; i += 1) {
    await pay(
      `ORD-2${String(i).padStart(3, '0')}`,
      45_000 + i * 37_500,
      'VND',
      `Đơn hàng số ${i}`,
      'SUCCEEDED',
    )
  }
  step('15 filler payments (list spans two pages)')

  await pay('ORD-1001', 500_000, 'VND', 'Áo thun cotton, size M', 'SUCCEEDED')
  await pay('ORD-1002', 1_250_000, 'VND', 'Giày chạy bộ', 'SUCCEEDED')
  await pay('ORD-1003', 4_999, 'USD', 'Annual plan, 1 seat', 'SUCCEEDED')
  await pay(undefined, 150_000, 'VND', undefined, 'SUCCEEDED')
  await pay('ORD-1004', 250_901, 'VND', 'Declined by the card issuer', 'FAILED')
  await pay('ORD-1005', 120_903, 'VND', 'Provider unavailable', 'FAILED')
  await pay('ORD-1006', 780_902, 'VND', 'Provider timed out: outcome unknown', 'PROCESSING')
  await pay('ORD-1007', 99_000, 'VND', 'Created, never confirmed', 'CREATED', false)
  step('payments: SUCCEEDED, FAILED (declined, technical), PROCESSING, CREATED, no order ID')

  // --- Refunds ---------------------------------------------------------------
  const partial = await pay('ORD-1008', 800_000, 'VND', 'Bộ chăn ga gối', 'SUCCEEDED')
  await refund(partial, 200_000, 'Khách trả lại một món', 'SUCCEEDED')
  await refund(partial, 100_901, 'CUSTOMER_REQUEST', 'FAILED')
  await reload(partial, 'PARTIALLY_REFUNDED')

  const full = await pay('ORD-1009', 300_000, 'VND', 'Tai nghe', 'SUCCEEDED')
  await refund(full, 300_000, 'CUSTOMER_REQUEST', 'SUCCEEDED')
  await reload(full, 'REFUNDED')

  const pending = await pay('ORD-1010', 650_000, 'VND', 'Đồng hồ treo tường', 'SUCCEEDED')
  await refund(pending, 150_902, undefined, 'PROCESSING')
  await reload(pending, 'SUCCEEDED')

  const many = await pay('ORD-1011', 2_000_000, 'VND', 'Combo nồi chảo', 'SUCCEEDED')
  await refund(many, 500_000, 'Hàng lỗi', 'SUCCEEDED')
  await refund(many, 250_000, 'Giao thiếu', 'SUCCEEDED')
  await refund(many, 50_903, 'CUSTOMER_REQUEST', 'FAILED')
  await reload(many, 'PARTIALLY_REFUNDED')

  const usd = await pay('ORD-1012', 25_000, 'USD', 'Hardware deposit', 'SUCCEEDED')
  await refund(usd, 5_000, 'Partial goodwill credit', 'SUCCEEDED')
  await reload(usd, 'PARTIALLY_REFUNDED')
  step('refunds: SUCCEEDED, FAILED (declined, technical), PROCESSING; payments PARTIALLY_REFUNDED, REFUNDED')

  // --- Webhook deliveries ------------------------------------------------------
  const deliveries = (endpointId: string) =>
    call<Delivery[]>('GET', '/merchant/webhook-deliveries', {
      token: jwt,
      query: { endpointId, size: 100 },
    }).then((r) => r.data)

  const moving = (d: Delivery) => d.status === 'PENDING' || d.status === 'DELIVERING'

  await waitFor('healthy endpoint deliveries to settle', async () => {
    const list = await deliveries(healthy.data.id)
    return list.length > 0 && list.every((d) => d.status === 'DELIVERED') ? list : undefined
  })
  await waitFor('failing endpoint deliveries to start retrying', async () => {
    const list = await deliveries(failing.data.id)
    return list.length > 0 && list.every((d) => !moving(d) && d.attemptCount >= 1) ? list : undefined
  })
  await waitFor('to-be-disabled endpoint deliveries to fail once', async () => {
    const list = await deliveries(toDisable.data.id)
    return list.length > 0 && list.every((d) => !moving(d) && d.attemptCount >= 1) ? list : undefined
  })
  // Disabling cancels its scheduled retries: they become DEAD (ENDPOINT_DISABLED).
  await call('DELETE', `/merchant/webhook-endpoints/${toDisable.data.id}`, { token: jwt })
  await waitFor('disabled endpoint deliveries to be DEAD', async () => {
    const list = await deliveries(toDisable.data.id)
    return list.every((d) => d.status === 'DEAD') ? list : undefined
  })
  await receiver.close()
  step(
    `webhook deliveries: DELIVERED, RETRYING, DEAD (receiver got ${receiver.counts.ok} ok, ${receiver.counts.failed} failed)`,
  )

  const result: SeedResult = { email: EMAIL, password: PASSWORD, merchantName: MERCHANT, apiKey }
  if (quietMode) return result

  // --- Summary -------------------------------------------------------------------
  const count = async (path: string, token: string, status: string) =>
    (await call<unknown[]>('GET', path, { token, query: { status, size: 1 } })).meta?.totalElements ?? 0

  const paymentCounts: Record<string, number> = {}
  for (const s of ['CREATED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED']) {
    paymentCounts[s] = await count('/payment-intents', apiKey, s)
  }
  const deliveryCounts: Record<string, number> = {}
  for (const s of ['PENDING', 'DELIVERING', 'DELIVERED', 'RETRYING', 'DEAD']) {
    deliveryCounts[s] = await count('/merchant/webhook-deliveries', jwt, s)
  }

  console.log('\nPayments by status')
  console.table(paymentCounts)
  console.log('Webhook deliveries by status')
  console.table(deliveryCounts)
  console.log(`
Sign in at http://localhost:5173
  email     ${EMAIL}
  password  ${PASSWORD}

Test API key, for calling the Merchant API directly (curl, a sample backend).
Shown once, local simulator only; the dashboard itself never needs it:
  ${apiKey}

The failing endpoint keeps retrying on the backend's schedule (10s … 1h) and
becomes DEAD, with a manual retry available, about 75 minutes from now. Start
the backend with WEBHOOK_DELIVERY_RETRY_DELAYS=2s,2s,2s,2s,2s to get there in seconds.`)
  return result
}

// Run as a CLI (`npm run seed`); importing the module only exposes `seed()`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch((error: unknown) => {
    console.error(`\nSeed failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  })
}
