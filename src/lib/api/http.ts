import { ApiError, isSessionRejected, type ProblemDetails } from './errors'
import type { Page, PageMeta } from './types'

/**
 * Thin fetch wrapper for the dashboard's two auth models (docs/api-contract.md §4):
 *  - `dashboard`: JWT bearer for /merchant/** routes, refreshed transparently on 401.
 *  - `none`:      auth endpoints (cookie based, needs the CSRF marker header).
 * The dashboard never sends merchant API keys: payments and refunds have their own
 * JWT routes (§18).
 *
 * Token storage is injected via `configureHttp`, so this file has no React/store imports.
 */
export type AuthMode = 'dashboard' | 'none'

interface HttpConfig {
  getAccessToken: () => string | null
  /** Must resolve to a fresh access token or throw. */
  refreshAccessToken: () => Promise<string>
  onSessionExpired: () => void
}

let config: HttpConfig | null = null

export function configureHttp(next: HttpConfig) {
  config = next
}

export const API_BASE = '/api/v1'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  auth?: AuthMode
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  idempotencyKey?: string
  signal?: AbortSignal
}

export interface HttpResult<T> {
  status: number
  data: T
  meta?: PageMeta
  /** `Idempotency-Replayed: true`: the server returned a stored earlier result. */
  replayed: boolean
}

export function buildUrl(path: string, query?: RequestOptions['query']) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`
}

function headersFor(options: RequestOptions, token: string | null): Headers {
  const headers = new Headers({ Accept: 'application/json, application/problem+json' })
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)
  if (options.auth === 'none' && (options.method ?? 'GET') === 'POST') {
    // Required browser-request marker for every auth POST (BR-AUTH-012).
    headers.set('X-FlowPay-CSRF', '1')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

function resolveToken(auth: AuthMode): string | null {
  return auth === 'dashboard' ? (config?.getAccessToken() ?? null) : null
}

async function send(path: string, options: RequestOptions, token: string | null) {
  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: headersFor(options, token),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw ApiError.client('NETWORK_ERROR', 'Network request failed.')
  }
}

/** Retry-After in seconds (the edge sends seconds; an HTTP date is converted). */
function retryAfterSeconds(response: Response): number | undefined {
  const value = response.headers.get('Retry-After')
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds))
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000))
}

async function toApiError(response: Response): Promise<ApiError> {
  const problem = (await response.json().catch(() => null)) as ProblemDetails | null
  // A bare 502–504 comes from the proxy/edge, not FlowPay: the backend is unreachable.
  const unreachable = response.status >= 502 && response.status <= 504
  return new ApiError(
    problem ?? { status: response.status, code: unreachable ? 'NETWORK_ERROR' : undefined },
    retryAfterSeconds(response),
  )
}

// Concurrent 401s share one refresh call. Refresh tokens rotate, so two
// parallel refreshes would invalidate each other.
let refreshInFlight: Promise<string> | null = null
function refreshOnce(): Promise<string> {
  if (!config) return Promise.reject(new Error('HTTP client not configured'))
  refreshInFlight ??= config.refreshAccessToken().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<HttpResult<T>> {
  const auth = options.auth ?? 'dashboard'
  let response = await send(path, options, resolveToken(auth))

  if (response.status === 401 && auth === 'dashboard') {
    let fresh: string
    try {
      fresh = await refreshOnce()
    } catch (refreshError) {
      // Only a refused session signs out. A network failure or 429 while
      // refreshing leaves the session in place; the caller sees that error.
      if (!isSessionRejected(refreshError)) throw refreshError
      config?.onSessionExpired()
      throw await toApiError(response)
    }
    response = await send(path, options, fresh)
  }

  if (!response.ok) throw await toApiError(response)

  const replayed = response.headers.get('Idempotency-Replayed') === 'true'
  if (response.status === 204) return { status: 204, data: undefined as T, replayed }

  const json = (await response.json().catch(() => null)) as { data: T; meta?: PageMeta } | null
  if (!json || !('data' in json)) {
    throw ApiError.client('UNEXPECTED_RESPONSE', 'The server returned an unexpected response.')
  }
  return { status: response.status, data: json.data, meta: json.meta, replayed }
}

/** Convenience for paged collection endpoints. */
export async function requestPage<T>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
  const result = await request<T[]>(path, options)
  if (!result.meta) throw ApiError.client('UNEXPECTED_RESPONSE', 'Missing pagination metadata.')
  return { items: result.data, meta: result.meta }
}
