import { describe, expect, it } from 'vitest'
import { buildSteps, lifecycleTimes } from './lifecycle'
import type { PaymentStatus, PaymentTransaction, Refund, TransactionStatus } from './types'

const CREATED = '2026-11-18T03:00:00.000Z'
const attempt = (
  attemptNo: number,
  status: TransactionStatus,
  startedAt: string,
  completedAt: string | null,
) =>
  ({
    id: `ptxn_${attemptNo}`,
    attemptNo,
    provider: 'SIMULATOR',
    providerTransactionId: null,
    status,
    failureCode: null,
    failureMessage: null,
    startedAt,
    completedAt,
  }) satisfies PaymentTransaction
const refund = (id: string, status: Refund['status'], completedAt: string | null) =>
  ({
    id,
    paymentId: 'pi_1',
    amount: 100,
    currency: 'VND',
    status,
    reason: null,
    provider: 'SIMULATOR',
    providerRefundId: null,
    failureCode: null,
    failureMessage: null,
    createdAt: completedAt ?? CREATED,
    updatedAt: completedAt ?? CREATED,
    completedAt,
  }) satisfies Refund
const payment = (status: PaymentStatus) => ({ status, createdAt: CREATED })

describe('lifecycleTimes', () => {
  it('dates processing by the first attempt and success by the attempt that succeeded', () => {
    const attempts = [attempt(1, 'SUCCEEDED', '2026-11-18T03:00:01.000Z', '2026-11-18T03:00:02.000Z')]
    expect(lifecycleTimes(payment('SUCCEEDED'), attempts)).toEqual({
      createdAt: CREATED,
      processingAt: '2026-11-18T03:00:01.000Z',
      settledAt: '2026-11-18T03:00:02.000Z',
      refundedAt: null,
    })
  })

  it('gives a payment still waiting on an UNKNOWN outcome no settled time', () => {
    // The backend completes an UNKNOWN attempt with a completedAt.
    const attempts = [attempt(1, 'UNKNOWN', '2026-11-18T03:00:01.000Z', '2026-11-18T03:00:06.000Z')]
    expect(lifecycleTimes(payment('PROCESSING'), attempts).settledAt).toBeNull()
  })

  it('dates a failure by the failed attempt', () => {
    const attempts = [attempt(1, 'FAILED', '2026-11-18T03:00:01.000Z', '2026-11-18T03:00:03.000Z')]
    expect(lifecycleTimes(payment('FAILED'), attempts).settledAt).toBe('2026-11-18T03:00:03.000Z')
  })

  it('dates full refunding by the last succeeded refund, ignoring failed ones', () => {
    const refunds = [
      refund('re_3', 'FAILED', '2026-11-18T06:00:00.000Z'),
      refund('re_2', 'SUCCEEDED', '2026-11-18T05:00:00.000Z'),
      refund('re_1', 'SUCCEEDED', '2026-11-18T04:00:00.000Z'),
    ]
    expect(lifecycleTimes(payment('REFUNDED'), [], { items: refunds, complete: false }).refundedAt).toBe(
      '2026-11-18T05:00:00.000Z',
    )
  })

  it('dates partial refunding by the first succeeded refund, only when every refund is loaded', () => {
    const refunds = [
      refund('re_2', 'SUCCEEDED', '2026-11-18T05:00:00.000Z'),
      refund('re_1', 'SUCCEEDED', '2026-11-18T04:00:00.000Z'),
      refund('re_0', 'PROCESSING', null),
    ]
    expect(
      lifecycleTimes(payment('PARTIALLY_REFUNDED'), [], { items: refunds, complete: true }).refundedAt,
    ).toBe('2026-11-18T04:00:00.000Z')
    // Older refunds may be on a later page: unknown, not guessed.
    expect(
      lifecycleTimes(payment('PARTIALLY_REFUNDED'), [], { items: refunds, complete: false }).refundedAt,
    ).toBeNull()
  })
})

describe('buildSteps', () => {
  const times = {
    createdAt: CREATED,
    processingAt: '2026-11-18T03:00:01.000Z',
    settledAt: '2026-11-18T03:00:02.000Z',
    refundedAt: '2026-11-18T04:00:00.000Z',
  }

  it('never puts a time on a step that has not happened', () => {
    const steps = buildSteps('PROCESSING', times)
    expect(steps.map((s) => [s.key, s.state, s.at !== null])).toEqual([
      ['created', 'done', true],
      ['processing', 'current', true],
      ['succeeded', 'upcoming', false],
      ['refunded', 'upcoming', false],
    ])
  })

  it('ends at Failed for a failed payment', () => {
    expect(buildSteps('FAILED', times).map((s) => [s.label, s.state])).toEqual([
      ['payment.CREATED', 'done'],
      ['payment.PROCESSING', 'done'],
      ['payment.FAILED', 'current'],
    ])
  })

  it('names the refund step after how much was refunded', () => {
    expect(buildSteps('PARTIALLY_REFUNDED', times).at(-1)).toMatchObject({
      label: 'payment.PARTIALLY_REFUNDED',
      state: 'current',
      at: times.refundedAt,
    })
    expect(buildSteps('SUCCEEDED', times).at(-1)).toMatchObject({
      label: 'payment.REFUNDED',
      state: 'upcoming',
      at: null,
    })
  })
})
