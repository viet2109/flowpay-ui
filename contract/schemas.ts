import { z } from 'zod'
import { SERVER_ERROR_CODES } from '@/lib/api/errors'

/**
 * Runtime mirrors of the frontend API types. Objects are strict: a field the
 * backend adds, drops or nulls differently fails the contract run, and
 * api.contract.ts asserts at compile time that each schema infers exactly the
 * type in `features/<name>/types.ts` / `api.ts`.
 */

const ULID = '[0-9A-HJKMNP-TV-Z]{26}'
export const publicId = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_${ULID}$`), `expected ${prefix}_<ULID>`)

/** ISO-8601 UTC instant; the backend sends up to microsecond precision. */
export const instant = z.iso.datetime().refine((v) => !Number.isNaN(Date.parse(v)), 'not parseable by Date')

const currency = z.string().regex(/^[A-Z]{3}$/)
const minor = z.number().int().nonnegative()

export const pageMeta = z.strictObject({
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
})

// --- auth / merchant / api keys ------------------------------------------------

export const registerResult = z.strictObject({
  user: z.strictObject({
    id: publicId('usr'),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  merchant: z.strictObject({ id: publicId('mrc'), name: z.string(), status: z.string() }),
})

export const loginResult = z.strictObject({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  user: z.strictObject({ id: publicId('usr'), email: z.string() }),
})

export const refreshResult = z.strictObject({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
})

export const merchant = z.strictObject({
  id: publicId('mrc'),
  name: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']),
  createdAt: instant,
})

export const apiKey = z.strictObject({
  id: publicId('key'),
  name: z.string(),
  prefix: z.string().regex(/^fp_test_[A-Za-z0-9_-]+$/),
  status: z.enum(['ACTIVE', 'REVOKED']),
  createdAt: instant,
})

export const createdApiKey = apiKey.extend({ key: z.string().regex(/^fp_test_[A-Za-z0-9_-]+$/) })

// --- payments / refunds ----------------------------------------------------------

const paymentStatus = z.enum([
  'CREATED',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
])
const transactionStatus = z.enum(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'UNKNOWN'])

export const paymentIntent = z.strictObject({
  id: publicId('pi'),
  orderId: z.string().nullable(),
  description: z.string().nullable(),
  amount: z.number().int().positive(),
  currency,
  status: paymentStatus,
  refundedAmount: minor,
  refundableAmount: minor,
  createdAt: instant,
  updatedAt: instant,
})

export const createdPaymentIntent = paymentIntent.omit({ updatedAt: true })

export const paymentTransaction = z.strictObject({
  id: publicId('ptxn'),
  attemptNo: z.number().int().positive(),
  provider: z.string(),
  providerTransactionId: z.string().nullable(),
  status: transactionStatus,
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  startedAt: instant,
  completedAt: instant.nullable(),
})

export const confirmResult = z.strictObject({
  paymentId: publicId('pi'),
  paymentStatus,
  transactionId: publicId('ptxn'),
  transactionStatus,
  provider: z.string(),
  providerTransactionId: z.string().nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
})

export const refund = z.strictObject({
  id: publicId('re'),
  paymentId: publicId('pi'),
  amount: z.number().int().positive(),
  currency,
  status: z.enum(['CREATED', 'PROCESSING', 'SUCCEEDED', 'FAILED']),
  reason: z.string().nullable(),
  provider: z.string(),
  providerRefundId: z.string().nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  createdAt: instant,
  updatedAt: instant,
  completedAt: instant.nullable(),
})

// --- webhooks --------------------------------------------------------------------

export const EVENT_TYPES = [
  'payment.processing',
  'payment.succeeded',
  'payment.failed',
  'refund.processing',
  'refund.succeeded',
  'refund.failed',
] as const
const eventType = z.enum(EVENT_TYPES)
const whsec = z.string().regex(/^whsec_\S+$/)

export const webhookEndpoint = z.strictObject({
  id: publicId('wep'),
  url: z.string(),
  status: z.enum(['ACTIVE', 'DISABLED']),
  events: z.array(eventType),
  createdAt: instant,
  updatedAt: instant,
})

export const createdEndpoint = webhookEndpoint.extend({ secret: whsec })

export const rotatedSecret = z.strictObject({ id: publicId('wep'), secret: whsec, updatedAt: instant })

export const webhookDelivery = z.strictObject({
  id: publicId('wdl'),
  endpointId: publicId('wep'),
  eventId: publicId('evt'),
  eventType,
  resourceType: z.enum(['PAYMENT_INTENT', 'REFUND']),
  resourceId: z.string().regex(new RegExp(`^(pi|re)_${ULID}$`)),
  status: z.enum(['PENDING', 'DELIVERING', 'DELIVERED', 'RETRYING', 'DEAD']),
  attemptCount: z.number().int().nonnegative(),
  nextAttemptAt: instant.nullable(),
  deliveredAt: instant.nullable(),
  lastHttpStatus: z.number().int().nullable(),
  lastError: z.string().nullable(),
  createdAt: instant,
  updatedAt: instant,
})

export const deliveryAttempt = z.strictObject({
  attemptNo: z.number().int().positive(),
  startedAt: instant,
  finishedAt: instant.nullable(),
  httpStatus: z.number().int().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  errorMessage: z.string().nullable(),
})

export const webhookDeliveryDetail = webhookDelivery.extend({ attempts: z.array(deliveryAttempt) })

// --- errors ------------------------------------------------------------------------

export const problem = z.strictObject({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string(),
  code: z.enum(SERVER_ERROR_CODES),
  requestId: z.string().regex(/^req_\S+$/),
  errors: z.array(z.strictObject({ field: z.string(), code: z.string(), message: z.string() })).optional(),
})
