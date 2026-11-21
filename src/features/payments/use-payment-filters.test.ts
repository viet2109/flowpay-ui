import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { isRangeInverted, parsePaymentFilters, toApiFilters, usePaymentFilters } from './use-payment-filters'

const parse = (search: string) => parsePaymentFilters(new URLSearchParams(search))

describe('parsePaymentFilters', () => {
  it('reads every filter from the URL', () => {
    expect(parse('?status=FAILED&orderId=ORD-1&from=2026-11-01&to=2026-11-20&page=2&size=50')).toEqual({
      status: 'FAILED',
      orderId: 'ORD-1',
      from: '2026-11-01',
      to: '2026-11-20',
      page: 2,
      size: 50,
    })
  })

  it('ignores values the backend would reject instead of sending them', () => {
    expect(parse('?status=LOST&from=2026-02-30&to=yesterday&page=-1&size=500')).toEqual({
      status: 'ALL',
      orderId: '',
      from: '',
      to: '',
      page: 0,
      size: 20,
    })
    expect(parse('?page=1.7&size=0').page).toBe(1)
    expect(parse('?size=0').size).toBe(20)
  })

  it('trims the order ID, as the backend does', () => {
    expect(parse('?orderId=%20ORD-1%20').orderId).toBe('ORD-1')
  })
})

describe('toApiFilters', () => {
  it('sends local day boundaries as instants', () => {
    const api = toApiFilters(parse('?from=2026-11-01&to=2026-11-20'))
    expect(api.createdFrom).toBe(new Date('2026-11-01T00:00:00').toISOString())
    expect(api.createdTo).toBe(new Date('2026-11-20T23:59:59.999').toISOString())
  })

  it('sends no dates while the range is inverted (the backend would answer 400)', () => {
    const state = parse('?from=2026-11-20&to=2026-11-01&status=FAILED')
    expect(isRangeInverted(state)).toBe(true)
    const api = toApiFilters(state)
    expect(api.createdFrom).toBeUndefined()
    expect(api.createdTo).toBeUndefined()
    expect(api.status).toBe('FAILED')
  })

  it('allows a single-day range', () => {
    expect(isRangeInverted(parse('?from=2026-11-01&to=2026-11-01'))).toBe(false)
  })
})

describe('usePaymentFilters', () => {
  function setup(search: string) {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(MemoryRouter, { initialEntries: [`/payments${search}`] }, children)
    return renderHook(() => ({ filters: usePaymentFilters(), location: useLocation() }), { wrapper })
  }

  it('goes back to the first page on a filter change and keeps the page size', () => {
    const { result } = setup('?page=3&size=50')
    act(() => result.current.filters.update({ status: 'SUCCEEDED' }))
    expect(result.current.location.search).toBe('?status=SUCCEEDED&size=50')
  })

  it('clears filters and page but keeps the page size', () => {
    const { result } = setup('?status=FAILED&orderId=A&from=2026-11-01&page=2&size=100')
    act(() => result.current.filters.clear())
    expect(result.current.location.search).toBe('?size=100')
    expect(result.current.filters.isFiltered).toBe(false)
  })

  it('leaves the default page size out of the URL', () => {
    const { result } = setup('?size=50')
    act(() => result.current.filters.update({ size: 20 }))
    expect(result.current.location.search).toBe('')
  })
})
