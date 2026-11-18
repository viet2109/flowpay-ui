import { KeyIcon } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Callout } from '@/components/callout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Panel } from '@/components/ui/panel'
import { errorMessage } from '@/lib/api/errors'
import { request } from '@/lib/api/http'
import { cn } from '@/lib/cn'
import { useTestKey } from '../store'

interface ConnectKeyPanelProps {
  /** Why the panel is showing again, e.g. the stored key was revoked. */
  reason?: string
  className?: string
}

/**
 * Shown wherever payment data is needed but no test key is connected.
 * The key is verified against the Merchant API before it is stored.
 */
export function ConnectKeyPanel({ reason, className }: ConnectKeyPanelProps) {
  const connect = useTestKey((s) => s.connect)
  const [value, setValue] = useState('')

  const verify = useMutation({
    mutationFn: (key: string) =>
      request('/payment-intents', { auth: 'merchant', merchantKey: key, query: { size: 1 } }),
    onSuccess: (_, key) => connect(key),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (value.trim()) verify.mutate(value.trim())
  }

  return (
    <Panel className={cn('mx-auto max-w-xl p-6', className)}>
      <div className="flex size-9 items-center justify-center rounded-md border border-line bg-surface-sunken">
        <KeyIcon className="size-4.5 text-ink-2" />
      </div>
      <h2 className="mt-4 text-base font-semibold">Connect a test key to see payments</h2>
      <p className="mt-1 text-sm text-ink-2">
        Payments and refunds are served by the Merchant API, the same API your backend calls with its secret
        key. Paste a <code className="font-mono text-xs">fp_test_</code> key to use it in this browser tab. It
        is cleared when the tab closes.
      </p>

      {reason && (
        <Callout tone="warning" className="mt-4">
          {reason}
        </Callout>
      )}

      <form onSubmit={submit} className="mt-5 flex items-end gap-2">
        <Field
          label="Test API key"
          className="flex-1"
          error={verify.isError ? errorMessage(verify.error) : undefined}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="fp_test_…"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
        </Field>
        <Button type="submit" variant="primary" loading={verify.isPending} disabled={!value.trim()}>
          Connect
        </Button>
      </form>

      <p className="mt-4 text-sm text-ink-3">
        No key yet?{' '}
        <Link to="/developers/api-keys" className="text-ink underline underline-offset-4 hover:text-accent">
          Create one in API keys
        </Link>{' '}
        and choose “Use in dashboard”.
      </p>
    </Panel>
  )
}
