import { describe, expect, it } from 'vitest'
import { formatDateTime, formatDuration, formatRelative, formatShortDate } from './format'

// Vitest runs with TZ=Asia/Ho_Chi_Minh (vite.config.ts): 07:05:12Z is 14:05:12 local.
const AT = '2026-11-19T07:05:12Z'

describe('formatDateTime', () => {
  it('follows D6 per language', () => {
    expect(formatDateTime(AT, 'en-GB')).toBe('19 Nov 2026, 14:05:12')
    expect(formatDateTime(AT, 'vi-VN')).toBe('19/11/2026 14:05:12')
  })

  it('shows a dash for missing values', () => {
    expect(formatDateTime(null, 'en-GB')).toBe('—')
  })
})

describe('formatShortDate', () => {
  it('drops the year and seconds', () => {
    expect(formatShortDate(AT, 'en-GB')).toBe('19 Nov, 14:05')
    expect(formatShortDate(AT, 'vi-VN')).toBe('19/11 14:05')
  })
})

describe('formatRelative', () => {
  const now = Date.parse(AT)
  const ago = (s: number) => new Date(now - s * 1000).toISOString()

  it('speaks the locale', () => {
    expect(formatRelative(ago(5 * 60), now, 'en-GB')).toBe('5 min ago')
    expect(formatRelative(ago(5 * 60), now, 'vi-VN')).toBe('5 phút trước')
    expect(formatRelative(ago(3 * 86_400), now, 'vi-VN')).toBe('3 ngày trước')
    expect(formatRelative(ago(86_400), now, 'vi-VN')).toBe('hôm qua')
  })

  it('says "now" for the last few seconds', () => {
    expect(formatRelative(ago(3), now, 'en-GB')).toBe('now')
    expect(formatRelative(ago(3), now, 'vi-VN')).toBe('bây giờ')
  })
})

describe('formatDuration', () => {
  it('uses the locale decimal separator', () => {
    expect(formatDuration(84, 'en-GB')).toBe('84 ms')
    expect(formatDuration(1234, 'en-GB')).toBe('1.23 s')
    expect(formatDuration(1234, 'vi-VN')).toBe('1,23 s')
    expect(formatDuration(null, 'vi-VN')).toBe('—')
  })
})
