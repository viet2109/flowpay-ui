import { auth as enAuth } from './en/auth'
import { common as enCommon } from './en/common'
import { errors as enErrors } from './en/errors'
import { merchant as enMerchant } from './en/merchant'
import { overview as enOverview } from './en/overview'
import { shell as enShell } from './en/shell'
import { status as enStatus } from './en/status'
import { validation as enValidation } from './en/validation'
import { webhooks as enWebhooks } from './en/webhooks'
import { auth as viAuth } from './vi/auth'
import { common as viCommon } from './vi/common'
import { errors as viErrors } from './vi/errors'
import { merchant as viMerchant } from './vi/merchant'
import { overview as viOverview } from './vi/overview'
import { shell as viShell } from './vi/shell'
import { status as viStatus } from './vi/status'
import { validation as viValidation } from './vi/validation'
import { webhooks as viWebhooks } from './vi/webhooks'

/** English is the source of truth for keys; every other language must match it (see Messages). */
export const en = {
  common: enCommon,
  errors: enErrors,
  shell: enShell,
  status: enStatus,
  validation: enValidation,
  auth: enAuth,
  merchant: enMerchant,
  overview: enOverview,
  webhooks: enWebhooks,
}
export const vi = {
  common: viCommon,
  errors: viErrors,
  shell: viShell,
  status: viStatus,
  validation: viValidation,
  auth: viAuth,
  merchant: viMerchant,
  overview: viOverview,
  webhooks: viWebhooks,
}

export const resources = { en, vi }
export const NAMESPACES = Object.keys(en) as (keyof typeof en)[]
