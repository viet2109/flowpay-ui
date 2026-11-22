import { afterEach, describe, expect, it } from 'vitest'
import { detectLanguage, ensureMessages, i18n, setLanguage } from '.'
import { NAMESPACES, type Source } from './resources'

/** All messages of a language, as loaded by the test setup (every namespace). */
const bundle = (language: string) =>
  Object.fromEntries(NAMESPACES.map((ns) => [ns, i18n.getResourceBundle(language, ns) as object]))
const en = bundle('en')
const resources = { en, vi: bundle('vi') }
import type { Messages } from './types'

afterEach(async () => {
  localStorage.clear()
  await i18n.changeLanguage('en')
})

describe('detectLanguage', () => {
  it('prefers the stored choice', () => {
    expect(detectLanguage('vi', ['en-US'])).toBe('vi')
  })

  it('ignores an unsupported stored value and uses the first supported browser language', () => {
    expect(detectLanguage('fr', ['fr-FR', 'vi-VN', 'en-US'])).toBe('vi')
  })

  it('falls back to English', () => {
    expect(detectLanguage(null, ['ja-JP'])).toBe('en')
    expect(detectLanguage(null, [])).toBe('en')
  })
})

describe('setLanguage', () => {
  it('re-translates without a reload, remembers the choice and updates <html lang>', async () => {
    expect(i18n.t('nav.overview')).toBe('Overview')

    await setLanguage('vi')

    expect(i18n.t('nav.overview')).toBe('Tổng quan')
    expect(localStorage.getItem('flowpay.language')).toBe('vi')
    expect(document.documentElement.lang).toBe('vi')
  })
})

/** "nav.overview", "language.current", … for every leaf string. */
function keysOf(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keysOf(value as object, `${prefix}${key}.`),
  )
}

/** Plural forms other than `_other` are optional per language (Vietnamese has one form). */
const required = (keys: string[]) => keys.filter((k) => !/_(zero|one|two|few|many)$/.test(k))

describe('resources', () => {
  it('every language has exactly the English keys (optional plural forms aside)', () => {
    for (const [language, messages] of Object.entries(resources)) {
      expect(required(keysOf(messages)), language).toEqual(required(keysOf(en)))
      for (const key of keysOf(messages)) expect(keysOf(en), `${language}: ${key}`).toContain(key)
    }
  })

  it('makes a missing or unknown key a compile error', () => {
    // @ts-expect-error: a translation without the `settings` namespace keys
    const incomplete: Messages<Source['merchant']> = {}
    // @ts-expect-error: a key that does not exist
    const unknown = i18n.t('nav.doesNotExist')
    // Plural forms other than `_other` are optional (Vietnamese has one form).
    const plural: Messages<{ items_one: string; items_other: string }> = { items_other: '{{count}} mục' }

    expect([incomplete, unknown, plural]).toHaveLength(3)
  })
})

describe('ensureMessages', () => {
  it('loads a namespace that is not loaded yet, once', async () => {
    i18n.removeResourceBundle('vi', 'payments')
    expect(i18n.hasResourceBundle('vi', 'payments')).toBe(false)
    await ensureMessages('vi', ['payments'])
    expect(i18n.getResource('vi', 'payments', 'title')).toBe('Thanh toán')
  })

  it('brings the namespaces on screen along when the language changes', async () => {
    i18n.removeResourceBundle('vi', 'webhooks')
    await setLanguage('vi')
    expect(i18n.hasResourceBundle('vi', 'webhooks')).toBe(true)
    expect(i18n.t('title', { ns: 'webhooks' })).toBe('Webhook')
  })
})
