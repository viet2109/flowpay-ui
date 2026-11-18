/**
 * RFC 9457 Problem Details as returned by FlowPay (docs/api-contract.md §2).
 * UI logic must branch on `code`, never on the human-readable `detail`.
 */
export interface FieldViolation {
  field: string
  code: string
  message: string
}

export interface ProblemDetails {
  type?: string
  title?: string
  status: number
  detail?: string
  instance?: string
  code?: string
  requestId?: string
  errors?: FieldViolation[]
}

/**
 * Every `code` FlowPay can return: docs/api-contract.md §17, plus codes the
 * backend emits that the contract does not list yet (ACCESS_DENIED for a missing
 * CSRF marker, MALFORMED_REQUEST, RESOURCE_NOT_FOUND). RATE_LIMIT_EXCEEDED comes
 * from the NGINX edge. `npm run test:contract` fails on any code not listed here.
 */
export const SERVER_ERROR_CODES = [
  'VALIDATION_ERROR',
  'MALFORMED_REQUEST',
  'AUTHENTICATION_REQUIRED',
  'ACCESS_DENIED',
  'INTERNAL_ERROR',
  'RESOURCE_NOT_FOUND',
  'USER_EMAIL_ALREADY_EXISTS',
  'INVALID_CREDENTIALS',
  'USER_LOCKED',
  'USER_DISABLED',
  'REFRESH_TOKEN_INVALID',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_TOKEN_REVOKED',
  'MERCHANT_NOT_FOUND',
  'MERCHANT_SUSPENDED',
  'API_KEY_NOT_FOUND',
  'API_KEY_REVOKED',
  'INVALID_API_KEY',
  'PAYMENT_NOT_FOUND',
  'PAYMENT_INVALID_STATE',
  'PAYMENT_ALREADY_SUCCEEDED',
  'REFUND_NOT_FOUND',
  'REFUND_INVALID_PAYMENT_STATE',
  'REFUND_AMOUNT_EXCEEDS_AVAILABLE',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_KEY_REUSED',
  'IDEMPOTENCY_REQUEST_IN_PROGRESS',
  'WEBHOOK_ENDPOINT_NOT_FOUND',
  'WEBHOOK_INVALID_STATE',
  'WEBHOOK_DELIVERY_NOT_FOUND',
  'RATE_LIMIT_EXCEEDED',
] as const
export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number]

/** Client-side codes that never come from the server. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'SANDBOX_KEY_MISSING' | 'UNEXPECTED_RESPONSE'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string
  readonly fieldErrors: FieldViolation[]

  constructor(problem: ProblemDetails) {
    super(problem.detail ?? problem.title ?? 'Request failed')
    this.name = 'ApiError'
    this.status = problem.status
    this.code = problem.code ?? `HTTP_${problem.status}`
    this.requestId = problem.requestId
    this.fieldErrors = problem.errors ?? []
  }

  static client(code: ClientErrorCode, message: string) {
    return new ApiError({ status: 0, code, detail: message })
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code)
}

/** Copy shown to merchants, keyed by stable backend error code. */
const MESSAGES: Partial<Record<ServerErrorCode | ClientErrorCode, string>> = {
  NETWORK_ERROR: 'Cannot reach FlowPay. Check that the backend is running.',
  INVALID_CREDENTIALS: 'That email and password combination is not recognised.',
  USER_EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  USER_LOCKED: 'This account is locked.',
  USER_DISABLED: 'This account has been disabled.',
  INVALID_API_KEY: 'The test key is not valid. Connect a different key.',
  API_KEY_REVOKED: 'The connected test key was revoked. Connect an active key.',
  MERCHANT_SUSPENDED: 'This merchant is suspended.',
  PAYMENT_INVALID_STATE: 'The payment is no longer in a state that allows this action.',
  PAYMENT_ALREADY_SUCCEEDED: 'This payment already succeeded.',
  REFUND_AMOUNT_EXCEEDS_AVAILABLE: 'The amount is larger than what is still refundable.',
  REFUND_INVALID_PAYMENT_STATE: 'Only succeeded or partially refunded payments can be refunded.',
  IDEMPOTENCY_KEY_REUSED: 'This request was already sent with different details.',
  IDEMPOTENCY_REQUEST_IN_PROGRESS: 'The same request is still being processed. Try again in a moment.',
  WEBHOOK_INVALID_STATE: 'The endpoint changed or is disabled. Reload and try again.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Wait a moment and retry.',
  INTERNAL_ERROR: 'FlowPay hit an unexpected error.',
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.code as ServerErrorCode] ?? error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
