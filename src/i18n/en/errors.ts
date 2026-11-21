/**
 * Copy for API errors, keyed by the stable backend `code` (never by `detail`).
 * Codes without an entry show the server's own message.
 */
export const errors = {
  unexpected: 'Something went wrong. Try again.',
  NETWORK_ERROR: 'Cannot reach FlowPay. Check that the backend is running.',
  INVALID_CREDENTIALS: 'That email and password combination is not recognised.',
  USER_EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  USER_LOCKED: 'This account is locked. Ask your FlowPay operator to unlock it.',
  USER_DISABLED: 'This account has been disabled. Ask your FlowPay operator to enable it.',
  MERCHANT_NOT_FOUND: 'This account is not linked to a merchant. Ask your FlowPay operator.',
  INVALID_API_KEY: 'The test key is not valid. Connect a different key.',
  API_KEY_REVOKED: 'The connected test key was revoked. Connect an active key.',
  MERCHANT_SUSPENDED: 'This merchant is suspended.',
  PAYMENT_INVALID_STATE: 'The payment is no longer in a state that allows this action.',
  REFUND_AMOUNT_EXCEEDS_AVAILABLE: 'The amount is larger than what is still refundable.',
  REFUND_INVALID_PAYMENT_STATE: 'Only succeeded or partially refunded payments can be refunded.',
  IDEMPOTENCY_KEY_REUSED: 'This request was already sent with different details.',
  IDEMPOTENCY_REQUEST_IN_PROGRESS: 'The same request is still being processed. Try again in a moment.',
  WEBHOOK_INVALID_STATE: 'The endpoint changed or is disabled. Reload and try again.',
  WEBHOOK_DELIVERY_NOT_FOUND: 'There is no delivery with this ID in your account.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Wait a moment and retry.',
  rateLimitedFor_one: 'Too many requests. Try again in {{count}} second.',
  rateLimitedFor_other: 'Too many requests. Try again in {{count}} seconds.',
  INTERNAL_ERROR: 'FlowPay hit an unexpected error.',
}
