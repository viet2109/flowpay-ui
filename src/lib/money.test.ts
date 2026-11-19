import { describe, expect, it } from 'vitest'
import {
  currencyDigits,
  formatMinor,
  formatNumber,
  minorToInput,
  numberSeparators,
  parseToMinor,
} from './money'

const EN = 'en-GB'
const VI = 'vi-VN'

describe('currencyDigits', () => {
  it('knows zero-decimal and three-decimal currencies', () => {
    expect(currencyDigits('VND')).toBe(0)
    expect(currencyDigits('USD')).toBe(2)
    expect(currencyDigits('KWD')).toBe(3)
  })
})

describe('formatMinor', () => {
  it('formats minor units for the currency in English', () => {
    expect(formatMinor(500000, 'VND', EN)).toBe('500,000')
    expect(formatMinor(12345, 'USD', EN)).toBe('123.45')
    expect(formatMinor(5, 'USD', EN)).toBe('0.05')
    expect(formatMinor(1234567, 'KWD', EN)).toBe('1,234.567')
  })

  it('formats minor units for the currency in Vietnamese', () => {
    expect(formatMinor(500000, 'VND', VI)).toBe('500.000')
    expect(formatMinor(12345, 'USD', VI)).toBe('123,45')
    expect(formatMinor(123456789, 'USD', VI)).toBe('1.234.567,89')
  })
})

describe('formatNumber', () => {
  it('groups counts per locale', () => {
    expect(formatNumber(1234, EN)).toBe('1,234')
    expect(formatNumber(1234, VI)).toBe('1.234')
  })
})

describe('numberSeparators', () => {
  it('reads separators from the locale', () => {
    expect(numberSeparators(EN)).toEqual({ group: ',', decimal: '.' })
    expect(numberSeparators(VI)).toEqual({ group: '.', decimal: ',' })
  })
})

describe('parseToMinor', () => {
  it('converts typed amounts with string math (no float drift)', () => {
    expect(parseToMinor('0.29', 'USD', EN)).toBe(29) // 0.29 * 100 = 28.999999999999996 in floats
    expect(parseToMinor('1,250.5', 'USD', EN)).toBe(125050)
    expect(parseToMinor('500 000', 'VND', EN)).toBe(500000)
  })

  it('reads Vietnamese separators', () => {
    expect(parseToMinor('500.000', 'VND', VI)).toBe(500000)
    expect(parseToMinor('1.250,5', 'USD', VI)).toBe(125050)
    expect(parseToMinor('12,50', 'USD', VI)).toBe(1250)
    expect(parseToMinor('0,29', 'USD', VI)).toBe(29)
  })

  it('rejects ambiguous grouping instead of guessing (no silent 100x)', () => {
    expect(parseToMinor('12,50', 'USD', EN)).toBeNull() // was 125000: 1,250.00 USD
    expect(parseToMinor('1,2,3', 'USD', EN)).toBeNull()
    expect(parseToMinor('12.50', 'USD', VI)).toBeNull()
    expect(parseToMinor('1250.50', 'USD', VI)).toBeNull()
    expect(parseToMinor('1,25,000', 'VND', EN)).toBeNull()
  })

  it('rejects input the currency cannot represent', () => {
    expect(parseToMinor('10.5', 'VND', EN)).toBeNull()
    expect(parseToMinor('1.234', 'USD', EN)).toBeNull()
    expect(parseToMinor('-5', 'USD', EN)).toBeNull()
    expect(parseToMinor('abc', 'USD', EN)).toBeNull()
    expect(parseToMinor('', 'USD', EN)).toBeNull()
    expect(parseToMinor('99999999999999999999', 'VND', EN)).toBeNull()
  })

  it('round-trips with minorToInput in both locales', () => {
    for (const locale of [EN, VI])
      for (const [amount, currency] of [
        [125050, 'USD'],
        [5, 'USD'],
        [500000, 'VND'],
        [1234567, 'KWD'],
      ] as const) {
        expect(parseToMinor(minorToInput(amount, currency, locale), currency, locale)).toBe(amount)
      }
  })

  it('accepts what formatMinor shows, so pasted amounts work', () => {
    for (const locale of [EN, VI]) {
      expect(parseToMinor(formatMinor(123456789, 'USD', locale), 'USD', locale)).toBe(123456789)
      expect(parseToMinor(formatMinor(1500000, 'VND', locale), 'VND', locale)).toBe(1500000)
    }
  })
})

describe('minorToInput', () => {
  it('uses the locale decimal separator without grouping', () => {
    expect(minorToInput(125050, 'USD', EN)).toBe('1250.50')
    expect(minorToInput(125050, 'USD', VI)).toBe('1250,50')
    expect(minorToInput(500000, 'VND', VI)).toBe('500000')
  })
})
