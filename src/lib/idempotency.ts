import { useCallback, useRef } from 'react'

/**
 * Idempotency keys represent one *intent*, not one click (BR-IDEM-003):
 *  - submitting the same values again (double click, retry after a timeout)
 *    reuses the key, so the server replays instead of charging twice;
 *  - changing the values is a new intent and gets a new key, which avoids
 *    409 IDEMPOTENCY_KEY_REUSED.
 */
export function newIdempotencyKey(scope: string): string {
  return `dash_${scope}_${crypto.randomUUID()}`
}

export function useIdempotencyKey(scope: string) {
  const last = useRef<{ fingerprint: string; key: string } | null>(null)

  /** Returns the key for these values. Same values -> same key. */
  const keyFor = useCallback(
    (values: unknown) => {
      const fingerprint = JSON.stringify(values)
      if (last.current?.fingerprint !== fingerprint) {
        last.current = { fingerprint, key: newIdempotencyKey(scope) }
      }
      return last.current.key
    },
    [scope],
  )

  /** Call when the dialog closes, so the next open is a new intent. */
  const reset = useCallback(() => {
    last.current = null
  }, [])

  return { keyFor, reset }
}
