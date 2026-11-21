import type { ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { attemptOutcome } from '../catalog'
import type { DeliveryAttempt, WebhookDeliveryDetail } from '../types'
import { AttemptTimeline } from './AttemptTimeline'
import { RetryTrack } from './RetryTrack'

const AT = '2026-11-18T03:00:00Z'
const attempt = (attemptNo: number, patch: Partial<DeliveryAttempt>): DeliveryAttempt => ({
  attemptNo,
  startedAt: AT,
  finishedAt: AT,
  httpStatus: 204,
  durationMs: 40,
  errorMessage: null,
  ...patch,
})
// What the backend writes (WebhookDeliveryAttempt.abandon): finished, status and duration unknown.
const leaseExpired = (n: number) =>
  attempt(n, { httpStatus: null, durationMs: null, errorMessage: 'DELIVERY_LEASE_EXPIRED' })
const http500 = (n: number) => attempt(n, { httpStatus: 500, durationMs: 120, errorMessage: 'HTTP_STATUS' })
const inFlight = (n: number) => attempt(n, { finishedAt: null, httpStatus: null, durationMs: null })

const detail = (patch: Partial<WebhookDeliveryDetail>): WebhookDeliveryDetail => ({
  id: 'wdl_1',
  endpointId: 'wep_1',
  eventId: 'evt_1',
  eventType: 'payment.succeeded',
  resourceType: 'PAYMENT_INTENT',
  resourceId: 'pi_1',
  status: 'RETRYING',
  attemptCount: 0,
  nextAttemptAt: null,
  deliveredAt: null,
  lastHttpStatus: null,
  lastError: null,
  createdAt: AT,
  updatedAt: AT,
  attempts: [],
  ...patch,
})
/** RelativeTime (next attempt) shows its exact time in a tooltip. */
const renderTrack = (ui: ReactElement) => render(ui, { wrapper: TooltipProvider })
const rowOf = (n: number) => screen.getByText(`#${n}`).closest('li')!

describe('attemptOutcome', () => {
  it('tells an unknown result apart from a failure', () => {
    expect(attemptOutcome(leaseExpired(1))).toBe('unknown')
    expect(attemptOutcome(http500(1))).toBe('http-failed')
    expect(attemptOutcome(attempt(1, { httpStatus: null, errorMessage: 'REQUEST_TIMEOUT' }))).toBe('failed')
    expect(attemptOutcome(inFlight(1))).toBe('in-flight')
    expect(attemptOutcome(attempt(1, {}))).toBe('succeeded')
  })
})

describe('AttemptTimeline', () => {
  it('shows a lease-expired attempt as unknown, with no status or duration made up', () => {
    render(<AttemptTimeline attempts={[leaseExpired(1)]} />)
    const row = within(rowOf(1))
    expect(row.getByText('Outcome unknown')).toBeInTheDocument()
    expect(row.getByText('DELIVERY_LEASE_EXPIRED')).toBeInTheDocument()
    expect(row.getByText(/Your receiver may still have got it/)).toBeInTheDocument()
    expect(rowOf(1).textContent).not.toMatch(/HTTP|ms\b|0 ms/)
    expect(rowOf(1).querySelector('.bg-warning')).not.toBeNull()
    expect(rowOf(1).querySelector('.bg-danger')).toBeNull()
  })

  it('explains a transport failure next to its code, and an HTTP failure by its status', () => {
    render(
      <AttemptTimeline
        attempts={[
          attempt(1, { httpStatus: null, durationMs: 5000, errorMessage: 'REQUEST_TIMEOUT' }),
          http500(2),
        ]}
      />,
    )
    expect(within(rowOf(1)).getByText('REQUEST_TIMEOUT')).toBeInTheDocument()
    expect(within(rowOf(1)).getByText(/request timeout \(5 s by default\)/)).toBeInTheDocument()
    expect(within(rowOf(2)).getByText('HTTP 500')).toBeInTheDocument()
    // HTTP_STATUS only restates the status code.
    expect(within(rowOf(2)).queryByText('HTTP_STATUS')).not.toBeInTheDocument()
  })

  it('shows an unrecognised code as it is, without an explanation', () => {
    render(
      <AttemptTimeline attempts={[attempt(1, { httpStatus: null, errorMessage: 'NEW_BACKEND_CODE' })]} />,
    )
    expect(within(rowOf(1)).getByText('NEW_BACKEND_CODE')).toBeInTheDocument()
    expect(rowOf(1).querySelectorAll('p')).toHaveLength(0)
  })

  it('marks an attempt in flight and attempts past the automatic budget as manual', () => {
    render(<AttemptTimeline attempts={[http500(6), inFlight(7)]} />)
    expect(within(rowOf(7)).getByText('Sending now')).toBeInTheDocument()
    expect(within(rowOf(7)).getByText('manual retry')).toBeInTheDocument()
    expect(within(rowOf(6)).queryByText('manual retry')).not.toBeInTheDocument()
  })
})

describe('RetryTrack', () => {
  const soon = () => new Date(Date.now() + 25_000).toISOString()

  it('summarises automatic retries with the real next attempt time', () => {
    renderTrack(
      <RetryTrack
        delivery={detail({ attemptCount: 2, attempts: [http500(1), leaseExpired(2)], nextAttemptAt: soon() })}
      />,
    )
    expect(screen.getByText(/2 of 6 automatic attempts used · next/)).toBeInTheDocument()
    expect(screen.getByText(/in 2[45] sec/)).toBeInTheDocument()
  })

  it('calls a retry after the automatic budget a manual one', () => {
    const six = [1, 2, 3, 4, 5, 6].map(http500)
    renderTrack(<RetryTrack delivery={detail({ attemptCount: 6, attempts: six, nextAttemptAt: soon() })} />)
    expect(screen.getByText(/Manual retry scheduled/)).toBeInTheDocument()
    // The scheduled manual attempt gets its own slot after the six automatic ones.
    expect(screen.getAllByText('manual')).toHaveLength(1)
  })

  it('says how a delivery ended', () => {
    const { unmount } = renderTrack(
      <RetryTrack
        delivery={detail({
          status: 'DELIVERED',
          attemptCount: 2,
          attempts: [leaseExpired(1), attempt(2, {})],
        })}
      />,
    )
    expect(screen.getByText('Delivered on attempt 2')).toBeInTheDocument()
    unmount()
    renderTrack(<RetryTrack delivery={detail({ status: 'DEAD', attemptCount: 1, attempts: [http500(1)] })} />)
    expect(screen.getByText('1 attempt, none delivered')).toBeInTheDocument()
  })
})
