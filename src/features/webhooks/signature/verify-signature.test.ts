import { describe, expect, it } from 'vitest'
import { verifyFlowPaySignature } from './verify-signature.js'

/**
 * The backend signer's own known vector (HmacSha256WebhookSignerTest): key "Jefe",
 * t=1700000000, body {"id":"evt_known"}. Real deliveries are checked by the
 * webhook-signature E2E through scripts/webhook-receiver.ts.
 */
const bytes = (text: string) => new TextEncoder().encode(text)
const T = 1700000000
const BODY = bytes('{"id":"evt_known"}')
const SECRET = 'Jefe'
const HEADER = `t=${T},v1=bb434a626b8d8c4b0594ac30dcb5cdb8ef0607f9554aa6a86f8626bd318a6577`

describe('verifyFlowPaySignature', () => {
  it('accepts the signature the backend produces', () => {
    expect(verifyFlowPaySignature(BODY, HEADER, SECRET, T)).toBe(true)
    // Within the 5-minute tolerance on either side.
    expect(verifyFlowPaySignature(BODY, HEADER, SECRET, T + 300)).toBe(true)
    expect(verifyFlowPaySignature(BODY, HEADER, SECRET, T - 300)).toBe(true)
  })

  it('rejects a changed body, secret or timestamp', () => {
    expect(verifyFlowPaySignature(bytes('{ "id":"evt_known"}'), HEADER, SECRET, T)).toBe(false)
    expect(verifyFlowPaySignature(BODY, HEADER, ' Jefe ', T)).toBe(false)
    expect(verifyFlowPaySignature(BODY, HEADER.replace(`t=${T}`, `t=${T + 1}`), SECRET, T)).toBe(false)
  })

  it('rejects a timestamp outside the tolerance even when the signature matches', () => {
    expect(verifyFlowPaySignature(BODY, HEADER, SECRET, T + 301)).toBe(false)
    expect(verifyFlowPaySignature(BODY, HEADER, SECRET, T - 301)).toBe(false)
  })

  it('rejects missing or malformed headers instead of throwing', () => {
    for (const header of [null, undefined, '', 't=,v1=', `v1=${'0'.repeat(64)}`, `t=${T}`, `t=${T},v1=abc`])
      expect(verifyFlowPaySignature(BODY, header, SECRET, T)).toBe(false)
    expect(verifyFlowPaySignature(BODY, HEADER.toUpperCase(), SECRET, T)).toBe(false)
  })
})
