import 'i18next'
import type { en } from './resources'

// Typed keys: t('nav.overvew') or a missing namespace fails typecheck.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'shell'
    resources: typeof en
  }
}
