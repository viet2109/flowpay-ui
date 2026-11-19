import { merchant as enMerchant } from './en/merchant'
import { shell as enShell } from './en/shell'
import { validation as enValidation } from './en/validation'
import { merchant as viMerchant } from './vi/merchant'
import { shell as viShell } from './vi/shell'
import { validation as viValidation } from './vi/validation'

/** English is the source of truth for keys; every other language must match it (see Messages). */
export const en = { shell: enShell, merchant: enMerchant, validation: enValidation }
export const vi = { shell: viShell, merchant: viMerchant, validation: viValidation }

export const resources = { en, vi }
export const NAMESPACES = Object.keys(en) as (keyof typeof en)[]
