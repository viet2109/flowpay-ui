import { Trans, useTranslation } from 'react-i18next'
import { CodeBlock } from '@/components/code-block'
// The same file scripts/webhook-receiver.ts runs against real deliveries, so the
// sample shown here is the one that is tested.
import SAMPLE from '../signature/verify-signature.js?raw'

const STEPS = ['read', 'compute', 'compare', 'respond', 'dedupe'] as const

/** How to verify FlowPay-Signature (docs/api-contract.md §14). */
export function SignatureGuide() {
  const { t } = useTranslation('webhooks')
  return (
    <div className="space-y-3 p-4 text-sm text-ink-2">
      <ol className="list-decimal space-y-1.5 pl-4">
        {STEPS.map((step) => (
          <li key={step}>
            <Trans
              ns="webhooks"
              i18nKey={`guide.${step}`}
              components={{ code: <code className="font-mono text-xs text-ink" /> }}
            />
          </li>
        ))}
      </ol>
      <CodeBlock label={t('guide.sample')} code={SAMPLE} />
    </div>
  )
}
