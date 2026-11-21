import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { DELIVERY_STATUSES, EVENT_TYPES, type DeliveryFilters } from './types'

/**
 * Delivery filters and the open delivery live in the URL
 * (?status=DEAD&eventType=payment.succeeded&endpointId=wep_…&page=1&delivery=wdl_…),
 * so a filtered list or one delivery can be bookmarked, shared and reloaded.
 * This hook is the only place that knows that format.
 *
 * Filter changes replace the history entry, like the payments list. Opening a
 * delivery pushes one, so Back closes the sheet; closing replaces it, so a sheet
 * opened from a shared link closes without leaving the page.
 *
 * `fixedEndpoint` (endpoint detail page) pins the endpoint and ignores the URL's.
 */
export function useDeliveryFilters(fixedEndpoint?: string) {
  const [params, setParams] = useSearchParams()

  const status = DELIVERY_STATUSES.find((s) => s === params.get('status'))
  const eventType = EVENT_TYPES.find((e) => e === params.get('eventType'))
  const urlEndpoint = params.get('endpointId') || undefined
  const endpointId = fixedEndpoint ?? urlEndpoint
  const page = Math.max(0, Math.floor(Number(params.get('page') ?? 0)) || 0)
  const openDelivery = params.get('delivery') || null

  function write(next: URLSearchParams, push = false) {
    setParams(next, { replace: !push })
  }

  /** Any filter change goes back to the first page; the open delivery stays open. */
  function update(patch: { status?: string; eventType?: string; endpointId?: string }) {
    const out = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) out.set(key, value)
      else out.delete(key)
    }
    out.delete('page')
    write(out)
  }

  function setPage(next: number) {
    const out = new URLSearchParams(params)
    if (next > 0) out.set('page', String(next))
    else out.delete('page')
    write(out)
  }

  function open(deliveryId: string) {
    const out = new URLSearchParams(params)
    out.set('delivery', deliveryId)
    write(out, true)
  }

  function close() {
    const out = new URLSearchParams(params)
    out.delete('delivery')
    write(out)
  }

  /** Clears the filters and the page; an open delivery stays open. */
  function clear() {
    const out = new URLSearchParams()
    if (openDelivery) out.set('delivery', openDelivery)
    write(out)
  }

  const apiFilters = useMemo<DeliveryFilters>(
    () => ({ status, eventType, endpointId, page, size: 20 }),
    [status, eventType, endpointId, page],
  )

  return {
    status,
    eventType,
    /** The endpoint filter from the URL (not the pinned one). */
    urlEndpoint,
    page,
    openDelivery,
    apiFilters,
    isFiltered: Boolean(status || eventType || (!fixedEndpoint && urlEndpoint)),
    update,
    setPage,
    open,
    close,
    clear,
  }
}
