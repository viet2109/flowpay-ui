import { describe, expect, it } from 'vitest'
import { canConfirm, canRefund, paymentStatus, refundStatus, transactionStatus } from './status'
import { PAYMENT_STATUSES } from './types'

/**
 * The backend state machines (PaymentIntent.java, docs/api-contract.md §11–12):
 * confirm only from CREATED; refund only SUCCEEDED / PARTIALLY_REFUNDED with
 * something left to refund. The UI must never offer anything else.
 */
describe('payment actions follow the backend state machine', () => {
  it('confirms only a CREATED payment', () => {
    expect(PAYMENT_STATUSES.filter(canConfirm)).toEqual(['CREATED'])
  })

  it('refunds only succeeded or partially refunded payments with an amount left', () => {
    const refundable = PAYMENT_STATUSES.filter((s) => canRefund(s, 1))
    expect([...refundable].sort()).toEqual(['PARTIALLY_REFUNDED', 'SUCCEEDED'])
    expect(canRefund('SUCCEEDED', 0)).toBe(false)
    expect(canRefund('PARTIALLY_REFUNDED', 0)).toBe(false)
  })
})

describe('status maps', () => {
  it('cover every status, with only the moving ones animated', () => {
    expect(Object.keys(paymentStatus).sort()).toEqual([...PAYMENT_STATUSES].sort())
    const live = (map: Record<string, { live?: boolean }>) =>
      Object.entries(map)
        .filter(([, v]) => v.live)
        .map(([k]) => k)
    expect(live(paymentStatus)).toEqual(['PROCESSING'])
    expect(live(refundStatus)).toEqual(['PROCESSING'])
    expect(live(transactionStatus)).toEqual(['PROCESSING'])
  })

  it('never shows an unknown provider outcome as a failure', () => {
    expect(transactionStatus.UNKNOWN.tone).not.toBe('danger')
    expect(paymentStatus.PROCESSING.tone).not.toBe('danger')
  })
})

describe('pollDelay', () => {
  it('reads quickly at first, then slower, then stops after two minutes', async () => {
    const { pollDelay, POLL_WINDOW_MS } = await import('./queries')
    expect(pollDelay(0)).toBe(2_000)
    expect(pollDelay(9_999)).toBe(2_000)
    expect(pollDelay(10_000)).toBe(5_000)
    expect(pollDelay(30_000)).toBe(15_000)
    expect(pollDelay(POLL_WINDOW_MS - 1)).toBe(15_000)
    expect(pollDelay(POLL_WINDOW_MS)).toBe(false)
    // A server clock slightly ahead counts as just started.
    expect(pollDelay(-500)).toBe(2_000)
  })
})
