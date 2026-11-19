import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'

type ValidationKey = ParseKeys<'validation'>
type Params = Record<string, string | number>

const PREFIX = 'validation:'

/**
 * A validation message for a Zod schema or setError: the key plus static
 * params, translated when it is rendered (useFieldError), so it follows the
 * language even if it changes while the error is shown.
 *   z.string().min(1, vmsg('required')).max(100, vmsg('tooLong', { max: 100 }))
 */
export function vmsg(key: ValidationKey, params?: Params): string {
  return params ? `${PREFIX}${key}|${JSON.stringify(params)}` : `${PREFIX}${key}`
}

/**
 * Turns a field error message into display text. Messages made with vmsg are
 * translated (render-time params such as a formatted example are merged in);
 * anything else, such as a server field error, is shown as it came.
 */
export function useFieldError() {
  const { t } = useTranslation('validation')
  return (message: string | undefined, params?: Params): string | undefined => {
    if (!message?.startsWith(PREFIX)) return message
    const [key, json] = message.slice(PREFIX.length).split('|') as [ValidationKey, string | undefined]
    return t(key, { ...(json ? (JSON.parse(json) as Params) : {}), ...params })
  }
}
