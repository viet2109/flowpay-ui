import { createServer, type IncomingHttpHeaders } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect } from 'vitest'
import { z } from 'zod'
import { ApiError } from '@/lib/api/errors'
import { pageMeta, problem as problemSchema } from './schemas'

export const API = (process.env.CONTRACT_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')

export interface Raw {
  status: number
  headers: Headers
  json: unknown
}

export interface CallOptions {
  token?: string
  body?: unknown
  idempotencyKey?: string
  /** Auth POSTs get the CSRF marker unless this is false. */
  csrf?: boolean
  cookie?: string
  query?: Record<string, string | number>
}

export async function call(method: string, path: string, options: CallOptions = {}): Promise<Raw> {
  const url = new URL(`${API}/api/v1${path}`)
  for (const [k, v] of Object.entries(options.query ?? {})) url.searchParams.set(k, String(v))
  const headers: Record<string, string> = { Accept: 'application/json, application/problem+json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
  if (options.cookie) headers.Cookie = options.cookie
  if (path.startsWith('/auth/') && method === 'POST' && options.csrf !== false)
    headers['X-FlowPay-CSRF'] = '1'

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new Error(`Cannot reach ${API}. Start the local stack first (docs/local-stack.md).`)
  }
  const text = await res.text()
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : undefined }
}

/** Response body for assertion messages, with anything secret-shaped masked. */
function hint(res: Raw): string {
  return (
    JSON.stringify(res.json)
      ?.replace(/(fp_test_|whsec_)[A-Za-z0-9_-]+/g, '$1***')
      .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<jwt>')
      .slice(0, 600) ?? '<empty>'
  )
}

export function expectStatus(res: Raw, status: number): void {
  expect(res.status, `HTTP ${res.status}: ${hint(res)}`).toBe(status)
}

/** `{ data }` envelope with nothing else (the backend omits a null `meta`). */
export function data<S extends z.ZodType>(res: Raw, status: number, schema: S): z.infer<S> {
  expectStatus(res, status)
  return (z.strictObject({ data: schema }).parse(res.json) as { data: z.infer<S> }).data
}

export function page<S extends z.ZodType>(res: Raw, schema: S) {
  expectStatus(res, 200)
  return z.strictObject({ data: z.array(schema), meta: pageMeta }).parse(res.json) as {
    data: z.infer<S>[]
    meta: z.infer<typeof pageMeta>
  }
}

/**
 * Problem Details: media type, strict shape, a code the frontend knows, a
 * request ID echoed in the header, and parsed the same way by `ApiError`.
 */
export function problem(res: Raw, status: number, code: string) {
  expectStatus(res, status)
  expect(res.headers.get('content-type')).toMatch(/^application\/problem\+json/)
  const body = problemSchema.parse(res.json)
  expect(body.code).toBe(code)
  expect(body.status).toBe(status)
  expect(res.headers.get('x-request-id')).toBe(body.requestId)
  const error = new ApiError(body)
  expect(error.code).toBe(code)
  expect(error.requestId).toBe(body.requestId)
  expect(error.fieldErrors).toEqual(body.errors ?? [])
  return body
}

export function fields(body: { errors?: { field: string }[] }): string[] {
  return (body.errors ?? []).map((e) => e.field).sort()
}

/** Local webhook receiver: `/ok` answers 200, anything else 500. */
export async function startReceiver() {
  const requests: { url: string; headers: IncomingHttpHeaders }[] = []
  const server = createServer((req, res) => {
    req.resume()
    requests.push({ url: req.url ?? '', headers: req.headers })
    res.writeHead(req.url === '/ok' ? 200 : 500).end()
  })
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const { port } = server.address() as AddressInfo
  return {
    base: `http://localhost:${port}`,
    requests,
    close: () => new Promise<void>((r) => server.close(() => r())),
  }
}

export async function eventually<T>(what: string, probe: () => Promise<T | undefined>, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await probe()
    if (value !== undefined) return value
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Timed out waiting for ${what}`)
}
