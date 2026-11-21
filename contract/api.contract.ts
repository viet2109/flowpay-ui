/**
 * Contract test: every endpoint the dashboard uses, against a real backend.
 * Checks shapes (strict), nullability, timestamps, ID prefixes, status codes,
 * idempotency headers and Problem Details codes, so `types.ts` stays honest.
 *
 *   npm run test:contract     (needs docs/local-stack.md running, dev profile)
 */
import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'
import type { ApiKey, CreatedApiKey } from '@/features/api-keys'
import type { LoginResult, RefreshResult, RegisterInput, RegisterResult } from '@/features/auth'
import type { Merchant } from '@/features/merchant'
import type {
  ConfirmResult,
  CreatedPaymentIntent,
  PaymentIntent,
  PaymentTransaction,
  Refund,
} from '@/features/payments'
import type {
  CreatedEndpoint,
  DeliveryAttempt,
  RotatedSecret,
  WebhookDelivery,
  WebhookDeliveryDetail,
  WebhookEndpoint,
} from '@/features/webhooks'
import type { PageMeta } from '@/lib/api/types'
import type { ProblemDetails } from '@/lib/api/errors'
import { decodeClaims } from '@/lib/jwt'
import { call, data, eventually, expectStatus, fields, page, problem, startReceiver } from './client'
import * as S from './schemas'

describe('schemas mirror the frontend types', () => {
  it('match exactly (compile-time)', () => {
    expectTypeOf<z.infer<typeof S.registerResult>>().toEqualTypeOf<RegisterResult>()
    expectTypeOf<z.infer<typeof S.loginResult>>().toEqualTypeOf<LoginResult>()
    expectTypeOf<z.infer<typeof S.refreshResult>>().toEqualTypeOf<RefreshResult>()
    expectTypeOf<z.infer<typeof S.merchant>>().toEqualTypeOf<Merchant>()
    expectTypeOf<z.infer<typeof S.apiKey>>().toEqualTypeOf<ApiKey>()
    expectTypeOf<z.infer<typeof S.createdApiKey>>().toEqualTypeOf<CreatedApiKey>()
    expectTypeOf<z.infer<typeof S.paymentIntent>>().toEqualTypeOf<PaymentIntent>()
    expectTypeOf<z.infer<typeof S.createdPaymentIntent>>().toEqualTypeOf<CreatedPaymentIntent>()
    expectTypeOf<z.infer<typeof S.paymentTransaction>>().toEqualTypeOf<PaymentTransaction>()
    expectTypeOf<z.infer<typeof S.confirmResult>>().toEqualTypeOf<ConfirmResult>()
    expectTypeOf<z.infer<typeof S.refund>>().toEqualTypeOf<Refund>()
    expectTypeOf<z.infer<typeof S.webhookEndpoint>>().toEqualTypeOf<WebhookEndpoint>()
    expectTypeOf<z.infer<typeof S.createdEndpoint>>().toEqualTypeOf<CreatedEndpoint>()
    expectTypeOf<z.infer<typeof S.rotatedSecret>>().toEqualTypeOf<RotatedSecret>()
    expectTypeOf<z.infer<typeof S.webhookDelivery>>().toEqualTypeOf<WebhookDelivery>()
    expectTypeOf<z.infer<typeof S.deliveryAttempt>>().toEqualTypeOf<DeliveryAttempt>()
    expectTypeOf<z.infer<typeof S.webhookDeliveryDetail>>().toEqualTypeOf<WebhookDeliveryDetail>()
    expectTypeOf<z.infer<typeof S.pageMeta>>().toEqualTypeOf<PageMeta>()
    // The frontend type is looser (every field optional); the real body must fit it.
    expectTypeOf<z.infer<typeof S.problem>>().toExtend<ProblemDetails>()
  })
})

const run = Date.now().toString(36)
const email = `contract+${run}@example.com`
const password = `Contract-${run}-pass`
const key = (name: string) => `contract-${run}-${name}`

let jwt = ''
let apiKey = ''
let receiver: Awaited<ReturnType<typeof startReceiver>>
let healthyEndpoint = ''
let failingEndpoint = ''

function cookieFrom(res: { headers: Headers }): string {
  const header = res.headers.getSetCookie().find((c) => c.startsWith('flowpay_refresh='))
  expect(header, 'flowpay_refresh cookie').toBeDefined()
  return header!.split(';')[0]!
}

beforeAll(async () => {
  receiver = await startReceiver()
})

afterAll(async () => {
  await receiver?.close()
})

describe('auth', () => {
  it('register returns user and merchant, lowercases the email (201)', async () => {
    const res = await call('POST', '/auth/register', {
      body: {
        email: email.toUpperCase(),
        password,
        firstName: 'Contract',
        lastName: 'Test',
        merchantName: 'Contract Store',
      },
    })
    const body = data(res, 201, S.registerResult)
    expect(body.user.email).toBe(email)
    expect(body.merchant.status).toBe('ACTIVE')
  })

  it('register rejects a duplicate email (409 USER_EMAIL_ALREADY_EXISTS)', async () => {
    const res = await call('POST', '/auth/register', {
      body: { email, password, firstName: 'A', lastName: 'B', merchantName: 'C' },
    })
    problem(res, 409, 'USER_EMAIL_ALREADY_EXISTS')
  })

  it('register field errors use the form field names (400 VALIDATION_ERROR)', async () => {
    const body = problem(await call('POST', '/auth/register', { body: {} }), 400, 'VALIDATION_ERROR')
    const formFields: (keyof RegisterInput)[] = ['email', 'firstName', 'lastName', 'merchantName', 'password']
    expect(new Set(fields(body))).toEqual(new Set(formFields))
  })

  it('auth POST without the CSRF marker is denied (403 ACCESS_DENIED)', async () => {
    const res = await call('POST', '/auth/login', { body: { email, password }, csrf: false })
    problem(res, 403, 'ACCESS_DENIED')
  })

  it('wrong password (401 INVALID_CREDENTIALS)', async () => {
    const res = await call('POST', '/auth/login', { body: { email, password: 'wrong-password' } })
    problem(res, 401, 'INVALID_CREDENTIALS')
  })

  it('login returns a 15-minute token and an HttpOnly refresh cookie on /api/v1/auth', async () => {
    const res = await call('POST', '/auth/login', { body: { email, password } })
    const body = data(res, 200, S.loginResult)
    expect(body.expiresIn).toBe(900)
    expect(body.user.email).toBe(email)
    const claims = decodeClaims(body.accessToken)
    expect(claims?.sub).toBe(body.user.id)
    expect(claims?.merchant).toMatch(/^mrc_/)
    expect(claims?.role).toBe('OWNER')
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('flowpay_refresh='))
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/)
    expect(cookie).toMatch(/SameSite=Lax/i)
    jwt = body.accessToken
  })

  it('refresh rotates the cookie; the old cookie is then rejected (401 REFRESH_TOKEN_*)', async () => {
    const login = await call('POST', '/auth/login', { body: { email, password } })
    const first = cookieFrom(login)
    const refreshed = await call('POST', '/auth/refresh', { cookie: first })
    data(refreshed, 200, S.refreshResult)
    const second = cookieFrom(refreshed)
    expect(second).not.toBe(first)

    const reused = await call('POST', '/auth/refresh', { cookie: first })
    problem(reused, 401, 'REFRESH_TOKEN_REVOKED')
  })

  it('refresh without a cookie (401 REFRESH_TOKEN_INVALID)', async () => {
    problem(await call('POST', '/auth/refresh'), 401, 'REFRESH_TOKEN_INVALID')
  })

  it('logout clears the cookie (204) and the session cannot refresh', async () => {
    const login = await call('POST', '/auth/login', { body: { email, password } })
    const cookie = cookieFrom(login)
    const out = await call('POST', '/auth/logout', { cookie })
    expectStatus(out, 204)
    expect(out.headers.getSetCookie().join(';')).toMatch(/flowpay_refresh=;|Max-Age=0/)
    // The server revokes the token on logout, so replaying it reports REVOKED.
    problem(await call('POST', '/auth/refresh', { cookie }), 401, 'REFRESH_TOKEN_REVOKED')
  })
})

describe('merchant profile', () => {
  it('requires a dashboard token (401 AUTHENTICATION_REQUIRED)', async () => {
    problem(await call('GET', '/merchant'), 401, 'AUTHENTICATION_REQUIRED')
  })

  it('get and update', async () => {
    const got = data(await call('GET', '/merchant', { token: jwt }), 200, S.merchant)
    expect(got.name).toBe('Contract Store')
    const updated = data(
      await call('PATCH', '/merchant', { token: jwt, body: { name: '  Contract Store 2  ' } }),
      200,
      S.merchant,
    )
    expect(updated.name).toBe('Contract Store 2')
  })

  it('blank name (400 VALIDATION_ERROR on name)', async () => {
    const body = problem(
      await call('PATCH', '/merchant', { token: jwt, body: { name: ' ' } }),
      400,
      'VALIDATION_ERROR',
    )
    expect(fields(body)).toEqual(['name'])
  })
})

describe('API keys', () => {
  it('create returns the raw key once (201); list never does', async () => {
    const created = data(
      await call('POST', '/merchant/api-keys', { token: jwt, body: { name: 'Contract' } }),
      201,
      S.createdApiKey,
    )
    expect(created.key.startsWith(created.prefix)).toBe(true)
    apiKey = created.key
    // Strict schema: a `key` field in the list fails here.
    const list = data(await call('GET', '/merchant/api-keys', { token: jwt }), 200, S.apiKey.array())
    expect(list.map((k) => k.id)).toContain(created.id)
  })

  it('revoke (204) keeps the row as REVOKED; the key then fails (401 API_KEY_REVOKED)', async () => {
    const created = data(
      await call('POST', '/merchant/api-keys', { token: jwt, body: { name: 'To revoke' } }),
      201,
      S.createdApiKey,
    )
    expectStatus(await call('DELETE', `/merchant/api-keys/${created.id}`, { token: jwt }), 204)
    const list = data(await call('GET', '/merchant/api-keys', { token: jwt }), 200, S.apiKey.array())
    expect(list.find((k) => k.id === created.id)?.status).toBe('REVOKED')
    problem(await call('GET', '/payment-intents', { token: created.key }), 401, 'API_KEY_REVOKED')
  })

  it('unknown key id (404 API_KEY_NOT_FOUND); bogus key (401 INVALID_API_KEY)', async () => {
    problem(
      await call('DELETE', '/merchant/api-keys/key_01ARZ3NDEKTSV4RRFFQ69G5FAV', { token: jwt }),
      404,
      'API_KEY_NOT_FOUND',
    )
    problem(await call('GET', '/payment-intents', { token: 'fp_test_notarealkey' }), 401, 'INVALID_API_KEY')
  })

  it('a dashboard token is not a Merchant API key (401 INVALID_API_KEY)', async () => {
    problem(await call('GET', '/payment-intents', { token: jwt }), 401, 'INVALID_API_KEY')
  })
})

describe('webhook endpoints', () => {
  it('create returns the secret once (201) with sorted events', async () => {
    const res = await call('POST', '/merchant/webhook-endpoints', {
      token: jwt,
      body: {
        url: `${receiver.base}/ok`,
        events: ['refund.succeeded', 'payment.succeeded', 'payment.failed'],
      },
    })
    const created = data(res, 201, S.createdEndpoint)
    expect(created.events).toEqual(['payment.failed', 'payment.succeeded', 'refund.succeeded'])
    expect(res.headers.get('location')).toBe(`/api/v1/merchant/webhook-endpoints/${created.id}`)
    healthyEndpoint = created.id

    const failing = await call('POST', '/merchant/webhook-endpoints', {
      token: jwt,
      body: { url: `${receiver.base}/fail`, events: ['payment.succeeded'] },
    })
    failingEndpoint = data(failing, 201, S.createdEndpoint).id
  })

  it('URL policy rejections are 400 VALIDATION_ERROR without field errors', async () => {
    // The URL policy answers with one generic problem and no `errors[]`, so the
    // dialog cannot map it to the URL field: validate on the client and show the
    // server's rejection as a form-level message.
    for (const url of ['ftp://example.com/hook', 'https://10.0.0.1/hook', 'http://example.com/hook']) {
      const res = problem(
        await call('POST', '/merchant/webhook-endpoints', {
          token: jwt,
          body: { url, events: ['payment.succeeded'] },
        }),
        400,
        'VALIDATION_ERROR',
      )
      expect(res.errors, url).toBeUndefined()
    }
  })

  it('empty events is a field error on events (400 VALIDATION_ERROR)', async () => {
    const res = problem(
      await call('POST', '/merchant/webhook-endpoints', {
        token: jwt,
        body: { url: `${receiver.base}/ok`, events: [] },
      }),
      400,
      'VALIDATION_ERROR',
    )
    expect(fields(res)).toEqual(['events'])
  })

  it('list and get never include the secret', async () => {
    const list = data(
      await call('GET', '/merchant/webhook-endpoints', { token: jwt }),
      200,
      S.webhookEndpoint.array(),
    )
    expect(list.map((e) => e.id)).toEqual([failingEndpoint, healthyEndpoint])
    data(
      await call('GET', `/merchant/webhook-endpoints/${healthyEndpoint}`, { token: jwt }),
      200,
      S.webhookEndpoint,
    )
    problem(
      await call('GET', '/merchant/webhook-endpoints/wep_01ARZ3NDEKTSV4RRFFQ69G5FAV', { token: jwt }),
      404,
      'WEBHOOK_ENDPOINT_NOT_FOUND',
    )
  })

  it('patch replaces the event set; rotate returns a new secret', async () => {
    const patched = data(
      await call('PATCH', `/merchant/webhook-endpoints/${healthyEndpoint}`, {
        token: jwt,
        body: { events: ['payment.succeeded', 'payment.failed', 'payment.processing', 'refund.succeeded'] },
      }),
      200,
      S.webhookEndpoint,
    )
    expect(patched.events).toHaveLength(4)
    const rotated = data(
      await call('POST', `/merchant/webhook-endpoints/${healthyEndpoint}/rotate-secret`, { token: jwt }),
      200,
      S.rotatedSecret,
    )
    expect(rotated.id).toBe(healthyEndpoint)
  })
})

let succeeded = ''
let created = ''

describe('payments', () => {
  it('create needs an Idempotency-Key (400 IDEMPOTENCY_KEY_REQUIRED)', async () => {
    const res = await call('POST', '/payment-intents', {
      token: apiKey,
      body: { amount: 1000, currency: 'VND' },
    })
    problem(res, 400, 'IDEMPOTENCY_KEY_REQUIRED')
  })

  it('field errors use the form field names (400 VALIDATION_ERROR)', async () => {
    const res = await call('POST', '/payment-intents', {
      token: apiKey,
      idempotencyKey: key('invalid'),
      body: { amount: 0, currency: 'XYZ' },
    })
    expect(fields(problem(res, 400, 'VALIDATION_ERROR'))).toEqual(['amount', 'currency'])
  })

  it('create (201, Location, no updatedAt) and replay (Idempotency-Replayed)', async () => {
    const body = { amount: 500_000, currency: 'VND', orderId: `ORD-${run}`, description: 'Contract' }
    const first = await call('POST', '/payment-intents', {
      token: apiKey,
      idempotencyKey: key('create'),
      body,
    })
    const payment = data(first, 201, S.createdPaymentIntent)
    expect(payment).toMatchObject({ status: 'CREATED', refundedAmount: 0, refundableAmount: 0 })
    expect(first.headers.get('location')).toBe(`/api/v1/payment-intents/${payment.id}`)
    expect(first.headers.get('idempotency-replayed')).toBeNull()

    const replay = await call('POST', '/payment-intents', {
      token: apiKey,
      idempotencyKey: key('create'),
      body,
    })
    expect(data(replay, 201, S.createdPaymentIntent)).toEqual(payment)
    expect(replay.headers.get('idempotency-replayed')).toBe('true')
    expect(replay.headers.get('location')).toBe(first.headers.get('location'))

    const reused = await call('POST', '/payment-intents', {
      token: apiKey,
      idempotencyKey: key('create'),
      body: { ...body, amount: 600_000 },
    })
    problem(reused, 409, 'IDEMPOTENCY_KEY_REUSED')
    created = payment.id
  })

  it('omitted orderId and description come back as explicit nulls', async () => {
    const res = await call('POST', '/payment-intents', {
      token: apiKey,
      idempotencyKey: key('bare'),
      body: { amount: 1_000, currency: 'USD' },
    })
    expect(data(res, 201, S.createdPaymentIntent)).toMatchObject({ orderId: null, description: null })
  })

  it('confirm: SUCCESS 200, replay, then 409 PAYMENT_INVALID_STATE', async () => {
    const payment = data(
      await call('POST', '/payment-intents', {
        token: apiKey,
        idempotencyKey: key('ok-create'),
        body: { amount: 800_000, currency: 'VND' },
      }),
      201,
      S.createdPaymentIntent,
    )
    const confirm = () =>
      call('POST', `/payment-intents/${payment.id}/confirm`, {
        token: apiKey,
        idempotencyKey: key('ok-confirm'),
      })
    const result = data(await confirm(), 200, S.confirmResult)
    expect(result).toMatchObject({
      paymentId: payment.id,
      paymentStatus: 'SUCCEEDED',
      transactionStatus: 'SUCCEEDED',
      provider: 'SIMULATOR',
      failureCode: null,
    })
    expect(result.providerTransactionId).toMatch(/^sim_/)

    const replay = await confirm()
    expect(data(replay, 200, S.confirmResult)).toEqual(result)
    expect(replay.headers.get('idempotency-replayed')).toBe('true')

    const again = await call('POST', `/payment-intents/${payment.id}/confirm`, {
      token: apiKey,
      idempotencyKey: key('ok-confirm-2'),
    })
    problem(again, 409, 'PAYMENT_INVALID_STATE')
    succeeded = payment.id
  })

  it.each([
    [250_901, 200, 'FAILED', 'FAILED'],
    [120_903, 200, 'FAILED', 'FAILED'],
    [780_902, 202, 'PROCESSING', 'UNKNOWN'],
  ] as const)(
    'confirm amount %i: %i, payment %s, attempt %s',
    async (amount, status, paymentStatus, txStatus) => {
      const payment = data(
        await call('POST', '/payment-intents', {
          token: apiKey,
          idempotencyKey: key(`create-${amount}`),
          body: { amount, currency: 'VND' },
        }),
        201,
        S.createdPaymentIntent,
      )
      const result = data(
        await call('POST', `/payment-intents/${payment.id}/confirm`, {
          token: apiKey,
          idempotencyKey: key(`confirm-${amount}`),
        }),
        status,
        S.confirmResult,
      )
      expect(result).toMatchObject({ paymentStatus, transactionStatus: txStatus })
      expect(result.failureCode).toEqual(expect.any(String))
      expect(result.failureMessage).toEqual(expect.any(String))
    },
  )

  it('get, transactions and unknown id (404 PAYMENT_NOT_FOUND)', async () => {
    const payment = data(
      await call('GET', `/payment-intents/${succeeded}`, { token: apiKey }),
      200,
      S.paymentIntent,
    )
    expect(payment).toMatchObject({ status: 'SUCCEEDED', refundableAmount: 800_000, orderId: null })
    const attempts = data(
      await call('GET', `/payment-intents/${succeeded}/transactions`, { token: apiKey }),
      200,
      S.paymentTransaction.array(),
    )
    expect(attempts).toHaveLength(1)
    expect(attempts[0]).toMatchObject({ attemptNo: 1, status: 'SUCCEEDED' })
    expect(attempts[0]?.completedAt).not.toBeNull()

    problem(
      await call('GET', '/payment-intents/pi_01ARZ3NDEKTSV4RRFFQ69G5FAV', { token: apiKey }),
      404,
      'PAYMENT_NOT_FOUND',
    )
  })

  it('list: paging meta and every filter the UI sends', async () => {
    const all = page(
      await call('GET', '/payment-intents', { token: apiKey, query: { size: 2 } }),
      S.paymentIntent,
    )
    expect(all.meta).toMatchObject({ page: 0, size: 2, hasPrevious: false })
    expect(all.meta.totalElements).toBeGreaterThanOrEqual(6)

    const byStatus = page(
      await call('GET', '/payment-intents', { token: apiKey, query: { status: 'FAILED' } }),
      S.paymentIntent,
    )
    expect(byStatus.data.map((p) => p.status)).toEqual(['FAILED', 'FAILED'])

    const byOrder = page(
      await call('GET', '/payment-intents', { token: apiKey, query: { orderId: `ORD-${run}` } }),
      S.paymentIntent,
    )
    expect(byOrder.data.map((p) => p.id)).toEqual([created])

    // The UI sends local-midnight boundaries as ISO instants (use-payment-filters).
    const from = new Date(Date.now() + 86_400_000).toISOString()
    const future = page(
      await call('GET', '/payment-intents', { token: apiKey, query: { createdFrom: from } }),
      S.paymentIntent,
    )
    expect(future.meta.totalElements).toBe(0)
    const to = new Date(Date.now() + 60_000).toISOString()
    const window = page(
      await call('GET', '/payment-intents', {
        token: apiKey,
        query: { createdFrom: new Date(Date.now() - 3_600_000).toISOString(), createdTo: to },
      }),
      S.paymentIntent,
    )
    expect(window.meta.totalElements).toBe(all.meta.totalElements)
  })

  it('invalid filters are rejected (400)', async () => {
    const res = await call('GET', '/payment-intents', { token: apiKey, query: { status: 'NOPE' } })
    expectStatus(res, 400)
    S.problem.parse(res.json)
    const tooBig = await call('GET', '/payment-intents', { token: apiKey, query: { size: 101 } })
    expectStatus(tooBig, 400)
    S.problem.parse(tooBig.json)
  })
})

describe('refunds', () => {
  it('a CREATED payment cannot be refunded (409 REFUND_INVALID_PAYMENT_STATE)', async () => {
    const res = await call('POST', `/payment-intents/${created}/refunds`, {
      token: apiKey,
      idempotencyKey: key('refund-created'),
      body: { amount: 1_000 },
    })
    problem(res, 409, 'REFUND_INVALID_PAYMENT_STATE')
  })

  it('create (201, Location, trimmed reason), replay, over-refund (409)', async () => {
    const body = { amount: 200_000, reason: '  Customer request  ' }
    const res = await call('POST', `/payment-intents/${succeeded}/refunds`, {
      token: apiKey,
      idempotencyKey: key('refund-1'),
      body,
    })
    const refund = data(res, 201, S.refund)
    expect(refund).toMatchObject({ status: 'SUCCEEDED', reason: 'Customer request', paymentId: succeeded })
    expect(refund.completedAt).not.toBeNull()
    expect(res.headers.get('location')).toBe(`/api/v1/refunds/${refund.id}`)

    const replay = await call('POST', `/payment-intents/${succeeded}/refunds`, {
      token: apiKey,
      idempotencyKey: key('refund-1'),
      body,
    })
    expect(data(replay, 201, S.refund)).toEqual(refund)
    expect(replay.headers.get('idempotency-replayed')).toBe('true')

    const over = await call('POST', `/payment-intents/${succeeded}/refunds`, {
      token: apiKey,
      idempotencyKey: key('refund-over'),
      body: { amount: 700_000 },
    })
    problem(over, 409, 'REFUND_AMOUNT_EXCEEDS_AVAILABLE')
  })

  it('blank reason becomes null; declined is 201 FAILED; unknown is 202 PROCESSING', async () => {
    const declined = data(
      await call('POST', `/payment-intents/${succeeded}/refunds`, {
        token: apiKey,
        idempotencyKey: key('refund-901'),
        body: { amount: 10_901, reason: '   ' },
      }),
      201,
      S.refund,
    )
    expect(declined).toMatchObject({ status: 'FAILED', reason: null, completedAt: expect.any(String) })
    expect(declined.failureCode).toEqual(expect.any(String))

    const pending = data(
      await call('POST', `/payment-intents/${succeeded}/refunds`, {
        token: apiKey,
        idempotencyKey: key('refund-902'),
        body: { amount: 50_902 },
      }),
      202,
      S.refund,
    )
    expect(pending).toMatchObject({ status: 'PROCESSING', completedAt: null })

    // Capacity: 800,000 - 200,000 refunded - 50,902 reserved by the PROCESSING refund.
    const payment = data(
      await call('GET', `/payment-intents/${succeeded}`, { token: apiKey }),
      200,
      S.paymentIntent,
    )
    expect(payment).toMatchObject({
      status: 'PARTIALLY_REFUNDED',
      refundedAmount: 200_000,
      refundableAmount: 800_000 - 200_000 - 50_902,
    })
  })

  it('reason over 255 characters (400 VALIDATION_ERROR on reason)', async () => {
    const res = await call('POST', `/payment-intents/${succeeded}/refunds`, {
      token: apiKey,
      idempotencyKey: key('refund-long'),
      body: { amount: 1_000, reason: 'x'.repeat(256) },
    })
    expect(fields(problem(res, 400, 'VALIDATION_ERROR'))).toEqual(['reason'])
  })

  it('list (paged), get, and unknown id (404 REFUND_NOT_FOUND)', async () => {
    const list = page(await call('GET', `/payment-intents/${succeeded}/refunds`, { token: apiKey }), S.refund)
    expect(list.data).toHaveLength(3)
    const first = list.data[0]!
    expect(data(await call('GET', `/refunds/${first.id}`, { token: apiKey }), 200, S.refund)).toEqual(first)
    problem(
      await call('GET', '/refunds/re_01ARZ3NDEKTSV4RRFFQ69G5FAV', { token: apiKey }),
      404,
      'REFUND_NOT_FOUND',
    )
  })
})

/** docs/api-contract.md §18: what the dashboard calls, with its session token. */
describe('dashboard payments and refunds', () => {
  it('reads return the Merchant API bodies, by path and credential only', async () => {
    const list = page(
      await call('GET', '/merchant/payments', { token: jwt, query: { size: 5 } }),
      S.paymentIntent,
    )
    const viaKey = page(
      await call('GET', '/payment-intents', { token: apiKey, query: { size: 5 } }),
      S.paymentIntent,
    )
    expect(list).toEqual(viaKey)

    const payment = data(
      await call('GET', `/merchant/payments/${succeeded}`, { token: jwt }),
      200,
      S.paymentIntent,
    )
    expect(payment).toEqual(
      data(await call('GET', `/payment-intents/${succeeded}`, { token: apiKey }), 200, S.paymentIntent),
    )
    data(
      await call('GET', `/merchant/payments/${succeeded}/transactions`, { token: jwt }),
      200,
      S.paymentTransaction.array(),
    )
    const refunds = page(
      await call('GET', `/merchant/payments/${succeeded}/refunds`, { token: jwt }),
      S.refund,
    )
    expect(refunds.data.length).toBeGreaterThan(0)
    const refund = refunds.data[0]!
    expect(data(await call('GET', `/merchant/refunds/${refund.id}`, { token: jwt }), 200, S.refund)).toEqual(
      refund,
    )

    problem(
      await call('GET', '/merchant/payments/pi_01ARZ3NDEKTSV4RRFFQ69G5FAV', { token: jwt }),
      404,
      'PAYMENT_NOT_FOUND',
    )
    problem(
      await call('GET', '/merchant/refunds/re_01ARZ3NDEKTSV4RRFFQ69G5FAV', { token: jwt }),
      404,
      'REFUND_NOT_FOUND',
    )
    problem(
      await call('GET', '/merchant/payments', { token: jwt, query: { status: 'LOST' } }),
      400,
      'VALIDATION_ERROR',
    )
  })

  it('a merchant API key is not a dashboard credential (401 AUTHENTICATION_REQUIRED)', async () => {
    problem(await call('GET', '/merchant/payments', { token: apiKey }), 401, 'AUTHENTICATION_REQUIRED')
  })

  it('create, confirm and refund (owner) with dashboard Locations', async () => {
    const created = await call('POST', '/merchant/payments', {
      token: jwt,
      idempotencyKey: key('dash-create'),
      body: { amount: 300_000, currency: 'VND', orderId: `DASH-${run}` },
    })
    const payment = data(created, 201, S.createdPaymentIntent)
    expect(created.headers.get('location')).toBe(`/api/v1/merchant/payments/${payment.id}`)

    const confirmed = await call('POST', `/merchant/payments/${payment.id}/confirm`, {
      token: jwt,
      idempotencyKey: key('dash-confirm'),
    })
    expect(data(confirmed, 200, S.confirmResult)).toMatchObject({ paymentStatus: 'SUCCEEDED' })

    const refunded = await call('POST', `/merchant/payments/${payment.id}/refunds`, {
      token: jwt,
      idempotencyKey: key('dash-refund'),
      body: { amount: 100_000 },
    })
    const refund = data(refunded, 201, S.refund)
    expect(refunded.headers.get('location')).toBe(`/api/v1/merchant/refunds/${refund.id}`)
  })

  it('one idempotency key means one request across both entry points', async () => {
    const body = { amount: 200_000, currency: 'VND', orderId: `CROSS-${run}` }
    const viaKey = data(
      await call('POST', '/payment-intents', { token: apiKey, idempotencyKey: key('cross'), body }),
      201,
      S.createdPaymentIntent,
    )
    const viaDashboard = await call('POST', '/merchant/payments', {
      token: jwt,
      idempotencyKey: key('cross'),
      body,
    })
    expect(data(viaDashboard, 201, S.createdPaymentIntent)).toEqual(viaKey)
    expect(viaDashboard.headers.get('idempotency-replayed')).toBe('true')
    problem(
      await call('POST', '/merchant/payments', {
        token: jwt,
        idempotencyKey: key('cross'),
        body: { ...body, amount: 250_000 },
      }),
      409,
      'IDEMPOTENCY_KEY_REUSED',
    )
  })
})

describe('webhook deliveries', () => {
  const deliveries = (query: Record<string, string | number>) =>
    call('GET', '/merchant/webhook-deliveries', { token: jwt, query })

  it('healthy endpoint: DELIVERED with an attempt history', async () => {
    const delivered = await eventually('a DELIVERED delivery', async () => {
      const list = page(
        await deliveries({ endpointId: healthyEndpoint, status: 'DELIVERED' }),
        S.webhookDelivery,
      )
      return list.data[0]
    })
    expect(delivered).toMatchObject({ lastHttpStatus: 200, lastError: null, nextAttemptAt: null })
    expect(delivered.deliveredAt).not.toBeNull()

    const detail = data(
      await call('GET', `/merchant/webhook-deliveries/${delivered.id}`, { token: jwt }),
      200,
      S.webhookDeliveryDetail,
    )
    expect(detail.attempts[0]).toMatchObject({ attemptNo: 1, httpStatus: 200, errorMessage: null })
    expect(detail.attempts[0]?.durationMs).toEqual(expect.any(Number))
  })

  it('failing endpoint: RETRYING with HTTP 500 and a next attempt', async () => {
    const retrying = await eventually('a RETRYING delivery', async () => {
      const list = page(
        await deliveries({ endpointId: failingEndpoint, status: 'RETRYING' }),
        S.webhookDelivery,
      )
      return list.data[0]
    })
    expect(retrying).toMatchObject({ lastHttpStatus: 500, attemptCount: 1 })
    expect(retrying.nextAttemptAt).not.toBeNull()
  })

  it('filters: eventType, unknown endpointId (empty), invalid status (400)', async () => {
    const succeededEvents = page(await deliveries({ eventType: 'payment.succeeded' }), S.webhookDelivery)
    expect(new Set(succeededEvents.data.map((d) => d.eventType))).toEqual(new Set(['payment.succeeded']))
    const none = page(await deliveries({ endpointId: 'wep_01ARZ3NDEKTSV4RRFFQ69G5FAV' }), S.webhookDelivery)
    expect(none.meta.totalElements).toBe(0)
    const bad = await deliveries({ status: 'NOPE' })
    problem(bad, 400, 'VALIDATION_ERROR')
  })

  it('manual retry is only for DEAD (409 WEBHOOK_INVALID_STATE); unknown id (404)', async () => {
    const delivered = page(
      await deliveries({ endpointId: healthyEndpoint, status: 'DELIVERED' }),
      S.webhookDelivery,
    )
    const id = delivered.data[0]!.id
    problem(
      await call('POST', `/merchant/webhook-deliveries/${id}/retry`, { token: jwt }),
      409,
      'WEBHOOK_INVALID_STATE',
    )
    problem(
      await call('GET', '/merchant/webhook-deliveries/wdl_01ARZ3NDEKTSV4RRFFQ69G5FAV', { token: jwt }),
      404,
      'WEBHOOK_DELIVERY_NOT_FOUND',
    )
  })

  it('disable (204, repeatable) cancels retries to DEAD; a disabled endpoint rejects changes (409)', async () => {
    expectStatus(await call('DELETE', `/merchant/webhook-endpoints/${failingEndpoint}`, { token: jwt }), 204)
    expectStatus(await call('DELETE', `/merchant/webhook-endpoints/${failingEndpoint}`, { token: jwt }), 204)

    const dead = page(await deliveries({ endpointId: failingEndpoint }), S.webhookDelivery)
    expect(dead.data.length).toBeGreaterThan(0)
    for (const d of dead.data) {
      expect(d).toMatchObject({ status: 'DEAD', nextAttemptAt: null })
    }
    problem(
      await call('POST', `/merchant/webhook-deliveries/${dead.data[0]!.id}/retry`, { token: jwt }),
      409,
      'WEBHOOK_INVALID_STATE',
    )
    problem(
      await call('PATCH', `/merchant/webhook-endpoints/${failingEndpoint}`, {
        token: jwt,
        body: { events: ['payment.failed'] },
      }),
      409,
      'WEBHOOK_INVALID_STATE',
    )
    problem(
      await call('POST', `/merchant/webhook-endpoints/${failingEndpoint}/rotate-secret`, { token: jwt }),
      409,
      'WEBHOOK_INVALID_STATE',
    )
    const endpoint = data(
      await call('GET', `/merchant/webhook-endpoints/${failingEndpoint}`, { token: jwt }),
      200,
      S.webhookEndpoint,
    )
    expect(endpoint.status).toBe('DISABLED')
  })
})
