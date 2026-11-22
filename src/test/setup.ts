import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { ensureMessages, i18n } from '@/i18n'
import { NAMESPACES } from '@/i18n/resources'

// In the app, routes load their messages; components are tested outside routes, so
// every namespace is loaded up front, in both languages.
await Promise.all([ensureMessages('en', NAMESPACES), ensureMessages('vi', NAMESPACES)])
// Tests assert English copy whatever the machine's language is.
await i18n.changeLanguage('en')

afterEach(() => cleanup())

// Browser APIs jsdom does not implement but Radix/cmdk/theme code touches.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
})) as typeof window.matchMedia

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.scrollTo = () => undefined
