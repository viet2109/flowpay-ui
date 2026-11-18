import { describe, expect, it } from 'vitest'
import { currencyDigits, formatMinor, minorToInput, parseToMinor } from './money'

describe('currencyDigits', () => {
  it('knows zero-decimal and three-decimal currencies', () => {
    expect(currencyDigits('VND')).toBe(0)
    expect(currencyDigits('USD')).toBe(2)
    expect(currencyDigits('KWD')).toBe(3)
  })
})

describe('formatMinor', () => {
  it('formats minor units for the currency', () => {
    expect(formatMinor(500000, 'VND')).toBe('500,000')
    expect(formatMinor(12345, 'USD')).toBe('123.45')
    expect(formatMinor(5, 'USD')).toBe('0.05')
  })
})

describe('parseToMinor', () => {
  it('converts typed amounts with string math (no float drift)', () => {
    expect(parseToMinor('0.29', 'USD')).toBe(29) // 0.29 * 100 = 28.999999999999996 in floats
    expect(parseToMinor('1,250.5', 'USD')).toBe(125050)
    expect(parseToMinor('500 000', 'VND')).toBe(500000)
  })

  it('rejects input the currency cannot represent', () => {
    expect(parseToMinor('10.5', 'VND')).toBeNull()
    expect(parseToMinor('1.234', 'USD')).toBeNull()
    expect(parseToMinor('-5', 'USD')).toBeNull()
    expect(parseToMinor('abc', 'USD')).toBeNull()
  })

  it('round-trips with minorToInput', () => {
    for (const [amount, currency] of [
      [125050, 'USD'],
      [5, 'USD'],
      [500000, 'VND'],
    ] as const) {
      expect(parseToMinor(minorToInput(amount, currency), currency)).toBe(amount)
    }
  })
})
