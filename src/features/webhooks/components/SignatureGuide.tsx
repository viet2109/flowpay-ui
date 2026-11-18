import { CodeBlock } from '@/components/code-block'

/** How to verify FlowPay-Signature (docs/api-contract.md §14, BR-WEB-003/004). */
const NODE_SAMPLE = `import crypto from 'node:crypto'

// Use the RAW request body (bytes), not re-serialised JSON.
export function verifyFlowPay(rawBody, header, secret) {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')))
  const timestamp = Number(parts.t)
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false // 5 min tolerance

  // Key = the whole secret string (whsec_…) as UTF-8. Output = lowercase hex.
  const expected = Buffer.from(
    crypto.createHmac('sha256', secret).update(\`\${parts.t}.\`).update(rawBody).digest('hex'),
  )
  const received = Buffer.from(parts.v1 ?? '')
  return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}`

export function SignatureGuide() {
  return (
    <div className="space-y-3 p-4 text-sm text-ink-2">
      <ol className="list-decimal space-y-1 pl-4">
        <li>
          Read <code className="font-mono text-xs">FlowPay-Signature: t=…,v1=…</code> and the raw body.
        </li>
        <li>
          Compute HMAC-SHA256 of <code className="font-mono text-xs">t + "." + body</code> with your signing
          secret.
        </li>
        <li>Reject if it differs or the timestamp is older than 5 minutes.</li>
        <li>
          Deduplicate by <code className="font-mono text-xs">FlowPay-Event-Id</code>; events can repeat and
          arrive out of order.
        </li>
      </ol>
      <CodeBlock label="node.js" code={NODE_SAMPLE} />
    </div>
  )
}
