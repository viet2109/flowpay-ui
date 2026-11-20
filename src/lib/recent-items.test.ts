import { beforeEach, describe, expect, it } from 'vitest'
import { useRecentItems, type RecentItem } from './recent-items'

const payment = (id: string): RecentItem => ({
  kind: 'payment',
  id,
  orderId: null,
  amount: 125_000,
  currency: 'VND',
})

describe('useRecentItems', () => {
  beforeEach(() => useRecentItems.getState().clear())

  it('keeps the most recent first, without duplicates', () => {
    const { remember } = useRecentItems.getState()
    remember(payment('pi_a'))
    remember({ kind: 'endpoint', id: 'wep_b', url: 'https://example.com/hook' })
    remember(payment('pi_a'))
    expect(useRecentItems.getState().items.map((i) => i.id)).toEqual(['pi_a', 'wep_b'])
  })

  it('keeps at most five, dropping the oldest', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) useRecentItems.getState().remember(payment(`pi_${n}`))
    expect(useRecentItems.getState().items.map((i) => i.id)).toEqual(['pi_6', 'pi_5', 'pi_4', 'pi_3', 'pi_2'])
  })

  it('persists across reloads and forgets everything on clear', () => {
    useRecentItems.getState().remember(payment('pi_a'))
    expect(JSON.parse(localStorage.getItem('flowpay.recent') ?? '[]')).toHaveLength(1)
    useRecentItems.getState().clear()
    expect(localStorage.getItem('flowpay.recent')).toBeNull()
    expect(useRecentItems.getState().items).toEqual([])
  })
})
