/**
 * The signature check shown in the endpoint page's guide. Kept as plain JavaScript so
 * merchants can paste it as is; the dashboard imports its source text (`?raw`), and
 * scripts/webhook-receiver.ts runs it against real deliveries.
 */
export function verifyFlowPaySignature(
  rawBody: Uint8Array | string,
  header: string | null | undefined,
  secret: string,
  nowSeconds?: number,
): boolean
