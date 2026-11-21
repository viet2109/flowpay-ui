import crypto from 'node:crypto'

const TOLERANCE_SECONDS = 5 * 60

/**
 * Verifies a FlowPay webhook request.
 *   rawBody  the request body exactly as received (Buffer), before any JSON parsing
 *   header   the FlowPay-Signature header: "t=<unix seconds>,v1=<hex>"
 *   secret   the endpoint's signing secret (whsec_…), used whole as the UTF-8 key
 */
export function verifyFlowPaySignature(rawBody, header, secret, nowSeconds = Date.now() / 1000) {
  const parts = Object.fromEntries(
    String(header ?? '')
      .split(',')
      .map((part) => part.trim().split('=')),
  )
  if (!/^\d+$/.test(parts.t ?? '') || !/^[0-9a-f]{64}$/.test(parts.v1 ?? '')) return false
  if (Math.abs(nowSeconds - Number(parts.t)) > TOLERANCE_SECONDS) return false

  // HMAC-SHA256 over the timestamp, a literal ".", and the body bytes.
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.`).update(rawBody).digest()
  return crypto.timingSafeEqual(expected, Buffer.from(parts.v1, 'hex'))
}
