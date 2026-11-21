import { describe, expect, it } from 'vitest'
import { forgetLegacyTestKey } from './http-setup'

describe('forgetLegacyTestKey', () => {
  it('removes a test API key an earlier version stored in the tab', () => {
    sessionStorage.setItem('flowpay.testKey', JSON.stringify({ state: { key: 'fp_test_old', label: null } }))
    forgetLegacyTestKey()
    expect(sessionStorage.getItem('flowpay.testKey')).toBeNull()
  })
})
