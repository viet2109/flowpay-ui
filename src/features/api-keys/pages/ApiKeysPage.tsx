import { KeyIcon, PlusIcon, PlugsConnectedIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Callout } from '@/components/callout'
import { CopyableId } from '@/components/copyable-id'
import { PageHeader } from '@/components/page-header'
import { RelativeTime } from '@/components/relative-time'
import { EmptyState, ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Panel } from '@/components/ui/panel'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { Tooltip } from '@/components/ui/tooltip'
import { useTestKey } from '@/features/test-mode'
import { useErrorMessage } from '@/i18n'
import type { ApiKey } from '../api'
import { CreateKeyDialog } from '../components/CreateKeyDialog'
import { useApiKeys, useRevokeApiKey } from '../queries'
import { keyStatus } from '../status'

export function ApiKeysPage() {
  const errorMessage = useErrorMessage()
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)
  const { data, isPending, error, refetch } = useApiKeys()
  const revoke = useRevokeApiKey()
  const connectedKey = useTestKey((s) => s.key)
  const disconnect = useTestKey((s) => s.disconnect)

  function confirmRevoke() {
    if (!revoking) return
    const target = revoking
    revoke.mutate(target.id, {
      onSuccess: () => {
        toast.success(`Revoked “${target.name}”`)
        // The connected dashboard key would stop working; drop it right away.
        if (connectedKey?.startsWith(target.prefix)) disconnect()
      },
      onError: (e) => toast.error(errorMessage(e)),
      onSettled: () => setRevoking(null),
    })
  }

  return (
    <>
      <PageHeader
        title="API keys"
        description="Secret keys for server-to-server calls. Never ship them in a browser or mobile app."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon weight="bold" />
            Create key
          </Button>
        }
      />

      <Callout tone="info" className="mb-5">
        Requests authenticate with <code className="font-mono text-xs">Authorization: Bearer fp_test_…</code>.
        Revoking a key is permanent and takes effect on the next request.
      </Callout>

      <Panel>
        {isPending ? (
          <TableSkeleton rows={3} columns={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<KeyIcon />}
            title="No API keys yet"
            action={
              <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
                Create your first key
              </Button>
            }
          >
            Create a key to call the Payment API from your backend, or to view payments in this dashboard.
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Key</Th>
                <Th>Status</Th>
                <Th className="hidden md:table-cell">ID</Th>
                <Th>Created</Th>
                <Th className="w-0" />
              </tr>
            </THead>
            <TBody>
              {data.map((key) => {
                const inDashboard = connectedKey?.startsWith(key.prefix) && key.status === 'ACTIVE'
                return (
                  <Tr key={key.id} className={key.status === 'REVOKED' ? 'text-ink-3' : undefined}>
                    <Td className="font-medium">
                      <span className="flex items-center gap-2">
                        {key.name}
                        {inDashboard && (
                          <Tooltip content="Connected to this dashboard tab">
                            <PlugsConnectedIcon className="size-4 text-accent" />
                          </Tooltip>
                        )}
                      </span>
                    </Td>
                    <Td>
                      <code className="font-mono text-xs">{key.prefix}…</code>
                    </Td>
                    <Td>
                      <StatusBadge {...keyStatus[key.status]} />
                    </Td>
                    <Td className="hidden md:table-cell">
                      <CopyableId value={key.id} />
                    </Td>
                    <Td className="text-ink-3">
                      <RelativeTime value={key.createdAt} />
                    </Td>
                    <Td className="text-right">
                      {key.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() => setRevoking(key)}
                        >
                          Revoke
                        </Button>
                      )}
                    </Td>
                  </Tr>
                )
              })}
            </TBody>
          </Table>
        )}
      </Panel>

      <CreateKeyDialog open={creating} onOpenChange={setCreating} />
      <ConfirmDialog
        open={Boolean(revoking)}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Revoke “${revoking?.name}”?`}
        description="Any backend still using this key will get 401 INVALID_API_KEY on its next request. This cannot be undone."
        confirmLabel="Revoke key"
        onConfirm={confirmRevoke}
        loading={revoke.isPending}
      />
    </>
  )
}
