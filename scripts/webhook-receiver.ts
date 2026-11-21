/**
 * A local webhook receiver that verifies every request with the exact code the
 * endpoint page shows merchants (src/features/webhooks/signature/verify-signature.js).
 * If the guide's code were wrong, real FlowPay deliveries to this receiver would fail.
 *
 *   FLOWPAY_WEBHOOK_SECRET=whsec_… npm run receiver
 *
 * Point an endpoint at http://localhost:4243/<any path> (the backend must run with
 * WEBHOOK_ALLOW_INSECURE_LOCALHOST=true, docs/local-stack.md). Replies:
 *   204  signature verified (any 2xx acknowledges the delivery)
 *   401  signature missing, wrong, stale, or no secret configured
 *   <n>  every request, when told to fail
 *
 * Environment (all optional):
 *   FLOWPAY_WEBHOOK_SECRET  the endpoint's signing secret; never printed
 *   RECEIVER_PORT           default 4243 (the seed's receiver uses 4242)
 *   RECEIVER_FAIL           an HTTP status (e.g. 500) to answer every request with
 *
 * While it runs, type `fail 500` to start failing with that status and `ok` to go
 * back to verifying. Tests import startWebhookReceiver() and change it in process.
 */
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'
import { verifyFlowPaySignature } from '../src/features/webhooks/signature/verify-signature.js'

export interface ReceivedRequest {
  path: string
  eventId: string | null
  /** From the body, read only once the signature verified. */
  eventType: string | null
  verified: boolean
  /** The status this receiver answered with. */
  status: number
}

export interface ReceiverOptions {
  /** 0 picks a free port. */
  port?: number
  secret?: string | null
  failWith?: number | null
  /** Print one line per request (CLI). */
  log?: boolean
}

export function startWebhookReceiver(options: ReceiverOptions = {}) {
  let secret = options.secret ?? null
  let failWith = options.failWith ?? null
  const received: ReceivedRequest[] = []

  const server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      // The raw bytes, exactly as sent: re-serialised JSON would not verify.
      const body = Buffer.concat(chunks)
      const header = req.headers['flowpay-signature']
      const verified =
        secret !== null && verifyFlowPaySignature(body, Array.isArray(header) ? header[0] : header, secret)
      const status = failWith ?? (verified ? 204 : 401)
      const eventId = req.headers['flowpay-event-id']
      const request: ReceivedRequest = {
        path: req.url ?? '/',
        eventId: typeof eventId === 'string' ? eventId : null,
        eventType: verified ? eventTypeOf(body) : null,
        verified,
        status,
      }
      received.push(request)
      if (options.log)
        console.log(
          `${new Date().toISOString()}  ${request.status}  ${verified ? 'verified' : 'NOT verified'}  ` +
            `${request.eventType ?? '-'}  ${request.eventId ?? '(no FlowPay-Event-Id)'}  ${request.path}`,
        )
      res.writeHead(status).end()
    })
  })

  /** Resolves to the port actually bound (matters when `port` is 0). */
  const ready = new Promise<number>((resolve, reject) => {
    server.once('error', (e) => reject(new Error(`Receiver port ${options.port ?? 0}: ${e.message}`)))
    server.listen(options.port ?? 0, () => resolve((server.address() as AddressInfo).port))
  })

  return {
    ready,
    received,
    setSecret: (value: string | null) => {
      secret = value
    },
    failWith: (status: number | null) => {
      failWith = status
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

function eventTypeOf(body: Buffer): string | null {
  try {
    const parsed = JSON.parse(body.toString('utf8')) as { type?: unknown }
    return typeof parsed.type === 'string' ? parsed.type : null
  } catch {
    return null
  }
}

function parseStatus(value: string | undefined): number | null {
  if (!value) return null
  const status = Number(value)
  if (!Number.isInteger(status) || status < 100 || status > 599)
    throw new Error(`Not an HTTP status: ${value}`)
  return status
}

// Run as a CLI (`npm run receiver`); importing the module only exposes startWebhookReceiver().
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const secret = process.env.FLOWPAY_WEBHOOK_SECRET?.trim() || null
  const receiver = startWebhookReceiver({
    port: Number(process.env.RECEIVER_PORT ?? 4243),
    secret,
    failWith: parseStatus(process.env.RECEIVER_FAIL),
    log: true,
  })
  receiver.ready.then(
    (port) => {
      console.log(`Webhook receiver on http://localhost:${port}`)
      if (!secret) console.log('No FLOWPAY_WEBHOOK_SECRET set: every request is answered 401.')
      if (process.env.RECEIVER_FAIL) console.log(`Failing every request with ${process.env.RECEIVER_FAIL}.`)
      console.log('Type `fail <status>` to fail requests, `ok` to verify again. Ctrl+C stops.')
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    },
  )
  createInterface({ input: process.stdin }).on('line', (line) => {
    const [command, value] = line.trim().split(/\s+/)
    try {
      if (command === 'ok') {
        receiver.failWith(null)
        console.log('Verifying signatures again.')
      } else if (command === 'fail') {
        receiver.failWith(parseStatus(value) ?? 500)
        console.log(`Failing every request with ${value ?? 500}.`)
      } else if (command) console.log('Commands: `fail <status>`, `ok`.')
    } catch (error) {
      console.log(error instanceof Error ? error.message : String(error))
    }
  })
}
