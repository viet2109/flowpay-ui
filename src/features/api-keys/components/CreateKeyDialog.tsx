import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Callout } from '@/components/callout'
import { SecretReveal } from '@/components/secret-reveal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useTestKey } from '@/features/test-mode'
import { errorMessage } from '@/lib/api/errors'
import type { CreatedApiKey } from '../api'
import { useCreateApiKey } from '../queries'

/**
 * Two steps in one dialog: name the key, then reveal it exactly once.
 * The dialog can't be dismissed by clicking outside on the reveal step, so the
 * secret isn't lost by accident.
 */
export function CreateKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const [useInDashboard, setUseInDashboard] = useState(true)
  const connect = useTestKey((s) => s.connect)
  const hasConnectedKey = useTestKey((s) => Boolean(s.key))
  const create = useCreateApiKey()

  function close() {
    if (created && useInDashboard) {
      connect(created.key, created.name)
      toast.success('Key connected to this dashboard tab')
    }
    onOpenChange(false)
    setName('')
    setCreated(null)
    setUseInDashboard(true)
    create.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) create.mutate(name.trim(), { onSuccess: setCreated })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      {created ? (
        <DialogContent
          title="Copy your new key"
          description={`“${created.name}” is active. Use it as a Bearer token from your backend.`}
          onInteractOutside={(e) => e.preventDefault()}
          footer={
            <Button variant="primary" onClick={close}>
              I’ve stored it
            </Button>
          }
        >
          <div className="space-y-5">
            <SecretReveal label="Secret key" secret={created.key} />
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line p-3">
              <Checkbox
                checked={useInDashboard}
                onCheckedChange={(v) => setUseInDashboard(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium">Use in dashboard</span>
                <span className="mt-0.5 block text-ink-2">
                  {hasConnectedKey ? 'Replace the currently connected key' : 'Connect this key'} so this tab
                  can show payments and refunds.
                </span>
              </span>
            </label>
          </div>
        </DialogContent>
      ) : (
        <DialogContent
          title="Create API key"
          description="Keys authenticate your backend against the Payment and Refund APIs."
          footer={
            <>
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="create-key"
                loading={create.isPending}
                disabled={!name.trim()}
              >
                Create key
              </Button>
            </>
          }
        >
          <form id="create-key" onSubmit={submit} className="space-y-4">
            {create.isError && <Callout tone="danger">{errorMessage(create.error)}</Callout>}
            <Field label="Name" hint="Describe where it will be used, e.g. “Checkout service – staging”.">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
            </Field>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
