import { KeyIcon, PlusIcon, PlugsConnectedIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Callout } from '@/components/callout'
import { CopyableId } from '@/components/copyable-id'
import { PageHeader } from '@/components/page-header'
import { RelativeTime } from '@/components/relative-time'
import { ActionError, EmptyState, ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Panel } from '@/components/ui/panel'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { Tooltip } from '@/components/ui/tooltip'
import { useTestKey } from '@/features/test-mode'
import type { ApiKey } from '../api'
import { CreateKeyDialog } from '../components/CreateKeyDialog'
import { useApiKeys, useRevokeApiKey } from '../queries'
import { keyStatus } from '../status'

export function ApiKeysPage() {
  const { t } = useTranslation('apiKeys')
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)
  const { data, isPending, error, refetch } = useApiKeys()
  const revoke = useRevokeApiKey()
  const connectedKey = useTestKey((s) => s.key)
  const disconnect = useTestKey((s) => s.disconnect)

  function closeRevoke() {
    setRevoking(null)
    revoke.reset()
  }

  /**
   * The row flips to Revoked at once (useRevokeApiKey) and rolls back if the
   * backend refuses; the failure stays in the dialog with its requestId.
   */
  function confirmRevoke() {
    if (!revoking) return
    const target = revoking
    revoke.mutate(target.id, {
      onSuccess: () => {
        toast.success(t('revoked', { name: target.name }))
        // The connected dashboard key would stop working; drop it right away.
        if (connectedKey?.startsWith(target.prefix)) disconnect()
        closeRevoke()
      },
    })
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon weight="bold" />
            {t('create')}
          </Button>
        }
      />

      <Callout tone="info" className="mb-5">
        <Trans t={t} i18nKey="usage" components={{ code: <code className="font-mono text-xs" /> }} />
      </Callout>

      <Panel>
        {isPending ? (
          <TableSkeleton rows={3} columns={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<KeyIcon />}
            title={t('empty.title')}
            action={
              <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
                {t('empty.action')}
              </Button>
            }
          >
            {t('empty.body')}
          </EmptyState>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('columns.name')}</Th>
                <Th>{t('columns.key')}</Th>
                <Th>{t('columns.status')}</Th>
                <Th className="hidden md:table-cell">{t('columns.id')}</Th>
                <Th>{t('columns.created')}</Th>
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
                          <Tooltip content={t('connected')}>
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
                          {t('revoke')}
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
        onOpenChange={(open) => !open && !revoke.isPending && closeRevoke()}
        title={t('revokeTitle', { name: revoking?.name })}
        description={t('revokeBody')}
        confirmLabel={t('revokeConfirm')}
        onConfirm={confirmRevoke}
        loading={revoke.isPending}
      >
        {revoke.error && <ActionError error={revoke.error} />}
      </ConfirmDialog>
    </>
  )
}
