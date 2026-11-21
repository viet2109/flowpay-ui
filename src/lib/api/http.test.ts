import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { configureHttp, request } from './http'

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json', ...headers },
  })
}

describe('request', () => {
  const fetchMock = vi.fn<typeof fetch>()
  let token = 'old-token'
  const refresh = vi.fn(async () => {
    token = 'new-token'
    return token
  })
  const onSessionExpired = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    token = 'old-token'
    configureHttp({
      getAccessToken: () => token,
      refreshAccessToken: refresh,
      onSessionExpired,
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('unwraps the data envelope and flags idempotent replays', async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: { id: 'pi_1' } }, { 'Idempotency-Replayed': 'true' }))
    const result = await request<{ id: string }>('/payment-intents', {
      method: 'POST',
      body: {},
      auth: 'dashboard',
    })
    expect(result).toMatchObject({ status: 201, data: { id: 'pi_1' }, replayed: true })
  })

  it('turns Problem Details into ApiError with the stable code', async () => {
    fetchMock.mockResolvedValueOnce(
      json(409, { status: 409, code: 'REFUND_AMOUNT_EXCEEDS_AVAILABLE', requestId: 'req_1', detail: 'x' }),
    )
    const error = await request('/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'REFUND_AMOUNT_EXCEEDS_AVAILABLE', requestId: 'req_1', status: 409 })
  })

  it('refreshes once for concurrent 401s and retries with the new token', async () => {
    fetchMock.mockImplementation(async (_url, init) => {
      const auth = new Headers(init?.headers).get('Authorization')
      return auth === 'Bearer new-token' ? json(200, { data: 'ok' }) : json(401, { status: 401 })
    })
    const results = await Promise.all([request('/merchant'), request('/merchant/api-keys')])
    expect(results.map((r) => r.data)).toEqual(['ok', 'ok'])
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('signs out only when the server refuses the session while refreshing', async () => {
    fetchMock.mockResolvedValue(json(401, { status: 401, code: 'AUTHENTICATION_REQUIRED' }))
    refresh.mockRejectedValueOnce(new ApiError({ status: 401, code: 'REFRESH_TOKEN_REVOKED' }))
    await expect(request('/merchant')).rejects.toMatchObject({ status: 401 })
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('keeps the session when the refresh itself cannot get through', async () => {
    fetchMock.mockResolvedValue(json(401, { status: 401, code: 'AUTHENTICATION_REQUIRED' }))
    refresh.mockRejectedValueOnce(ApiError.client('NETWORK_ERROR', 'offline'))
    await expect(request('/merchant')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    refresh.mockRejectedValueOnce(new ApiError({ status: 429, code: 'RATE_LIMIT_EXCEEDED' }, 60))
    await expect(request('/merchant')).rejects.toMatchObject({ code: 'RATE_LIMIT_EXCEEDED' })
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('reads Retry-After from a 429', async () => {
    fetchMock.mockResolvedValueOnce(
      json(429, { status: 429, code: 'RATE_LIMIT_EXCEEDED', requestId: 'req_9' }, { 'Retry-After': '60' }),
    )
    await expect(request('/auth/login', { method: 'POST', auth: 'none', body: {} })).rejects.toMatchObject({
      status: 429,
      retryAfter: 60,
    })
  })

  it('sends the CSRF marker on auth POSTs only', async () => {
    fetchMock.mockImplementation(async () => json(200, { data: {} })) // fresh body per call
    await request('/auth/login', { method: 'POST', auth: 'none', body: {} })
    await request('/merchant')
    const [loginInit, merchantInit] = fetchMock.mock.calls.map((c) => new Headers(c[1]?.headers))
    expect(loginInit?.get('X-FlowPay-CSRF')).toBe('1')
    expect(merchantInit?.get('X-FlowPay-CSRF')).toBeNull()
  })

  it('sends the session token, never a merchant API key, for payments', async () => {
    fetchMock.mockImplementation(async () => json(200, { data: {} }))
    await request('/merchant/payments/pi_1')
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(headers.get('Authorization')).toMatch(/^Bearer (?!fp_)/)
  })
})
