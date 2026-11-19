import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { i18n } from '@/i18n'

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
