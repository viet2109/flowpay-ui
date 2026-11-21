import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { newIdempotencyKey, useIdempotencyKey } from './idempotency'

/**
 * A key stands for one intent (contract §10): the same request sent again (double
 * click, retry after a timeout) must reuse it so the server replays instead of
 * acting twice; a different request must not, or the server answers
 * 409 IDEMPOTENCY_KEY_REUSED.
 */
describe('useIdempotencyKey', () => {
  it('gives the same values the same key, however often they are sent', () => {
    const { result } = renderHook(() => useIdempotencyKey('create'))
    const first = result.current.keyFor({ amount: 500000, currency: 'VND' })
    expect(result.current.keyFor({ amount: 500000, currency: 'VND' })).toBe(first)
    expect(result.current.keyFor({ amount: 500000, currency: 'VND' })).toBe(first)
  })

  it('gives changed values a new key', () => {
    const { result } = renderHook(() => useIdempotencyKey('create'))
    const first = result.current.keyFor({ amount: 500000, currency: 'VND' })
    expect(result.current.keyFor({ amount: 600000, currency: 'VND' })).not.toBe(first)
  })

  it('keeps the key across re-renders', () => {
    const { result, rerender } = renderHook(() => useIdempotencyKey('confirm'))
    const first = result.current.keyFor('pi_1')
    rerender()
    expect(result.current.keyFor('pi_1')).toBe(first)
  })

  it('starts a new intent after reset', () => {
    const { result } = renderHook(() => useIdempotencyKey('confirm'))
    const first = result.current.keyFor('pi_1')
    result.current.reset()
    expect(result.current.keyFor('pi_1')).not.toBe(first)
  })

  it('makes scoped, unique keys', () => {
    const a = newIdempotencyKey('refund')
    expect(a).toMatch(/^dash_refund_[0-9a-f-]{36}$/)
    expect(newIdempotencyKey('refund')).not.toBe(a)
  })
})
