import { ArrowsClockwiseIcon, DotsThreeIcon, PencilSimpleIcon, ProhibitIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Callout } from '@/components/callout'
import { CopyableId } from '@/components/copyable-id'
import { DescriptionList } from '@/components/description-list'
import { PageHeader } from '@/components/page-header'
import { SecretReveal } from '@/components/secret-reveal'
import { ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { useErrorMessage, useFormat } from '@/i18n'
import { useRecentItems } from '@/lib/recent-items'
import { endpointStatus } from '../catalog'
import { DeliveriesView } from '../components/DeliveriesView'
import { EndpointFormDialog } from '../components/EndpointFormDialog'
import { EndpointUrl } from '../components/EndpointUrl'
import { SignatureGuide } from '../components/SignatureGuide'
import { useDisableEndpoint, useEndpoint, useRotateSecret } from '../queries'
import { EVENT_TYPES } from '../types'

export function EndpointDetailPage() {
  const { t } = useTranslation('webhooks')
  const errorMessage = useErrorMessage()
  const fmt = useFormat()
  const { endpointId = '' } = useParams()
  const { data: endpoint, isPending, error, refetch } = useEndpoint(endpointId)
  // Offered again in the command menu's "Recent".
  const remember = useRecentItems((s) => s.remember)
  useEffect(() => {
    if (endpoint) remember({ kind: 'endpoint', id: endpoint.id, url: endpoint.url })
  }, [endpoint, remember])
  const [editing, setEditing] = useState(false)
  // Each opening starts a fresh form from the current endpoint. Keyed by session, not
  // by updatedAt: saving refetches the endpoint before the save's own callbacks run,
  // and a new key would replace the dialog mid-save, dropping its toast and close.
  const [editSession, setEditSession] = useState(0)
  function startEditing() {
    setEditSession((n) => n + 1)
    setEditing(true)
  }
  const [confirm, setConfirm] = useState<'rotate' | 'disable' | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const rotate = useRotateSecret()
  const disable = useDisableEndpoint()

  const back = { to: '/developers/webhooks', label: 'Webhooks' }

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-96 max-w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }
  if (error) {
    return (
      <>
        <PageHeader title="Endpoint" back={back} />
        <Panel>
          <ErrorState error={error} onRetry={refetch} />
        </Panel>
      </>
    )
  }

  const active = endpoint.status === 'ACTIVE'

  function runRotate() {
    rotate.mutate(endpoint!.id, {
      onSuccess: (result) => {
        setConfirm(null)
        setNewSecret(result.secret)
      },
      onError: (e) => toast.error(errorMessage(e)),
    })
  }

  function runDisable() {
    disable.mutate(endpoint!.id, {
      onSuccess: () => toast.success('Endpoint disabled'),
      onError: (e) => toast.error(errorMessage(e)),
      onSettled: () => setConfirm(null),
    })
  }

  return (
    <>
      <PageHeader
        back={back}
        title={<EndpointUrl url={endpoint.url} className="text-lg" />}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <StatusBadge {...endpointStatus[endpoint.status]} />
            <CopyableId value={endpoint.id} truncate={false} />
          </span>
        }
        actions={
          active && (
            <>
              <Button onClick={startEditing}>
                <PencilSimpleIcon />
                Edit
              </Button>
              <Menu>
                <MenuTrigger asChild>
                  <Button size="icon" aria-label="More actions">
                    <DotsThreeIcon weight="bold" />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem onSelect={() => setConfirm('rotate')}>
                    <ArrowsClockwiseIcon />
                    Rotate signing secret
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem tone="danger" onSelect={() => setConfirm('disable')}>
                    <ProhibitIcon />
                    Disable endpoint
                  </MenuItem>
                </MenuContent>
              </Menu>
            </>
          )
        }
      />

      {!active && (
        <Callout tone="info" className="mb-5" title="This endpoint is disabled">
          It no longer receives events and cannot be re-enabled. Its configuration and delivery history are
          kept. Add a new endpoint to resume delivery.
        </Callout>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel className="min-w-0">
          <PanelHeader
            title="Deliveries"
            description="Newest first. Moving deliveries refresh automatically."
          />
          <div className="p-4">
            <DeliveriesView endpointId={endpoint.id} />
          </div>
        </Panel>

        <aside className="space-y-5">
          <Panel>
            <PanelHeader title="Subscribed events" />
            <ul className="divide-y divide-line">
              {EVENT_TYPES.map((event) => {
                const on = endpoint.events.includes(event)
                return (
                  <li key={event} className={cn('flex items-start gap-3 px-4 py-2.5', !on && 'opacity-40')}>
                    <span
                      className={cn(
                        'mt-1.5 size-1.5 shrink-0 rounded-full',
                        on ? 'bg-success' : 'bg-line-strong',
                      )}
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-xs">{event}</div>
                      <div className="text-xs text-ink-3">{t(`event.${event}`)}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="Verify signatures" />
            <SignatureGuide />
          </Panel>
          <Panel>
            <PanelHeader title="Details" />
            <DescriptionList
              className="px-4 py-1"
              items={[
                { label: 'Created', value: fmt.dateTime(endpoint.createdAt) },
                { label: 'Updated', value: fmt.dateTime(endpoint.updatedAt) },
                { label: 'Timeouts', value: '2 s connect · 5 s request' },
                { label: 'Redirects', value: 'Never followed' },
              ]}
            />
          </Panel>
        </aside>
      </div>

      <EndpointFormDialog key={editSession} open={editing} onOpenChange={setEditing} endpoint={endpoint} />

      <ConfirmDialog
        open={confirm === 'rotate'}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone="default"
        title="Rotate signing secret?"
        description="The old secret stops working for new attempts immediately. There is no grace period, so update your receiver right after."
        confirmLabel="Rotate secret"
        onConfirm={runRotate}
        loading={rotate.isPending}
      />
      <ConfirmDialog
        open={confirm === 'disable'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Disable this endpoint?"
        description="Pending and retrying deliveries are cancelled and marked dead. Disabled endpoints cannot be re-enabled."
        confirmLabel="Disable endpoint"
        onConfirm={runDisable}
        loading={disable.isPending}
      />
      <Dialog open={Boolean(newSecret)} onOpenChange={(o) => !o && setNewSecret(null)}>
        <DialogContent
          title="New signing secret"
          description="Requests from now on are signed with this secret."
          onInteractOutside={(e) => e.preventDefault()}
          footer={
            <Button variant="primary" onClick={() => setNewSecret(null)}>
              I’ve stored it
            </Button>
          }
        >
          {newSecret && <SecretReveal label="Signing secret" secret={newSecret} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
