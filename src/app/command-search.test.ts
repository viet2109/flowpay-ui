import { describe, expect, it } from 'vitest'
import { commandFilter, foldDiacritics, parseId } from './command-search'

const ULID = '01JD5Z8Q3W4X5Y6Z7A8B9C0D1E'

describe('parseId', () => {
  it('maps each public ID prefix to its page', () => {
    expect(parseId(`pi_${ULID}`)).toEqual({ kind: 'payment', id: `pi_${ULID}`, to: `/payments/pi_${ULID}` })
    expect(parseId(`re_${ULID}`)).toEqual({ kind: 'refund', id: `re_${ULID}`, to: `/refunds/re_${ULID}` })
    expect(parseId(`wep_${ULID}`)).toEqual({
      kind: 'endpoint',
      id: `wep_${ULID}`,
      to: `/developers/webhooks/wep_${ULID}`,
    })
    expect(parseId(`wdl_${ULID}`)).toEqual({
      kind: 'delivery',
      id: `wdl_${ULID}`,
      to: `/developers/webhooks/deliveries?delivery=wdl_${ULID}`,
    })
  })

  it('accepts surrounding whitespace and either case, as pasted', () => {
    expect(parseId(`  PI_${ULID.toLowerCase()}\n`)?.id).toBe(`pi_${ULID}`)
  })

  it('rejects text that is not a whole public ID', () => {
    expect(parseId('payments')).toBeNull()
    expect(parseId(`key_${ULID}`)).toBeNull() // API keys have no page of their own
    expect(parseId(`pi_${ULID.slice(1)}`)).toBeNull() // too short
    expect(parseId(`pi_${ULID.slice(1)}U`)).toBeNull() // U is not in the ULID alphabet
    expect(parseId(`see pi_${ULID}`)).toBeNull()
  })
})

describe('commandFilter', () => {
  it('folds Vietnamese diacritics, including đ', () => {
    expect(foldDiacritics('Thanh toán thất bại')).toBe('thanh toan that bai')
    expect(foldDiacritics('Điều khoản')).toBe('dieu khoan')
  })

  it('finds a Vietnamese label typed without diacritics', () => {
    expect(commandFilter('Thanh toán', 'thanh toan')).toBeGreaterThan(0)
    expect(commandFilter('Cài đặt', 'cai dat')).toBeGreaterThan(0)
  })

  it('matches keywords too, and still rejects unrelated text', () => {
    expect(commandFilter('Khóa API', 'bi mat', ['khóa', 'bí', 'mật'])).toBeGreaterThan(0)
    expect(commandFilter('Thanh toán', 'webhook')).toBe(0)
  })
})
