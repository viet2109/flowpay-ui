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
import { ActionError, ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { useFormat } from '@/i18n'
import { useRecentItems } from '@/lib/recent-items'
import { endpointStatus } from '../catalog'
import { DeliveriesView } from '../components/DeliveriesView'
import { EndpointFormDialog } from '../components/EndpointFormDialog'
import { EndpointUrl } from '../components/EndpointUrl'
import { SignatureGuide } from '../components/SignatureGuide'
import { useDeliveryCounts, useDisableEndpoint, useEndpoint, useRotateSecret } from '../queries'
import { EVENT_TYPES } from '../types'

export function EndpointDetailPage() {
  const { t } = useTranslation('webhooks')
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
  // What disabling cancels (backend: PENDING and RETRYING become DEAD), asked only when it is about to happen.
  const cancellable = useDeliveryCounts(endpointId, ['PENDING', 'RETRYING'], {
    enabled: confirm === 'disable',
  })
  const cancelled = cancellable.counts.PENDING + cancellable.counts.RETRYING

  const back = { to: '/developers/webhooks', label: t('title') }

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
        <PageHeader title={t('detail.title')} back={back} />
        <Panel>
          <ErrorState error={error} onRetry={refetch} />
        </Panel>
      </>
    )
  }

  const active = endpoint.status === 'ACTIVE'

  // Failures stay in the open dialog (with their requestId) so the person can retry in place.
  function closeConfirm() {
    setConfirm(null)
    rotate.reset()
    disable.reset()
  }

  function runRotate() {
    rotate.mutate(endpoint!.id, {
      onSuccess: (result) => {
        closeConfirm()
        setNewSecret(result.secret)
      },
    })
  }

  function runDisable() {
    disable.mutate(endpoint!.id, {
      onSuccess: () => {
        closeConfirm()
        toast.success(t('disable.done'))
      },
    })
  }

  return (
    <>
      <PageHeader
        back={back}
        title={<EndpointUrl url={endpoint.url} className="block text-lg" />}
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
                {t('detail.edit')}
              </Button>
              <Menu>
                <MenuTrigger asChild>
                  <Button size="icon" aria-label={t('detail.moreActions')}>
                    <DotsThreeIcon weight="bold" />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem onSelect={() => setConfirm('rotate')}>
                    <ArrowsClockwiseIcon />
                    {t('detail.rotate')}
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem tone="danger" onSelect={() => setConfirm('disable')}>
                    <ProhibitIcon />
                    {t('detail.disable')}
                  </MenuItem>
                </MenuContent>
              </Menu>
            </>
          )
        }
      />

      {!active && (
        <Callout tone="info" className="mb-5" title={t('detail.disabledTitle')}>
          {t('detail.disabledBody')}
        </Callout>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel className="min-w-0">
          <PanelHeader title={t('detail.deliveries')} description={t('detail.deliveriesHint')} />
          <div className="p-4">
            <DeliveriesView endpointId={endpoint.id} />
          </div>
        </Panel>

        <aside className="min-w-0 space-y-5">
          <Panel>
            <PanelHeader title={t('detail.subscribed')} />
            <ul className="divide-y divide-line">
              {EVENT_TYPES.map((event) => {
                const on = endpoint.events.includes(event)
                return (
                  <li key={event} className="flex items-start gap-3 px-4 py-2.5">
                    <span
                      className={cn(
                        'mt-1.5 size-1.5 shrink-0 rounded-full',
                        on ? 'bg-success' : 'bg-line-strong',
                      )}
                    />
                    {/* Muted with tokens, not opacity, so the text keeps its contrast. */}
                    <div className="min-w-0">
                      <div className={cn('font-mono text-xs', on ? 'text-ink' : 'text-ink-3')}>{event}</div>
                      <div className="text-xs text-ink-3">
                        {on ? t(`event.${event}`) : t('detail.notSubscribed')}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title={t('detail.verify')} />
            <SignatureGuide />
          </Panel>
          <Panel>
            <PanelHeader title={t('detail.details')} />
            <DescriptionList
              className="px-4 py-1"
              items={[
                { label: t('detail.created'), value: fmt.dateTime(endpoint.createdAt) },
                { label: t('detail.updated'), value: fmt.dateTime(endpoint.updatedAt) },
                // docs/api-contract.md §14: connect/request timeouts default to 2 s / 5 s; redirects never followed.
                { label: t('detail.timeouts'), value: t('detail.timeoutsValue') },
                { label: t('detail.redirects'), value: t('detail.redirectsValue') },
              ]}
            />
          </Panel>
        </aside>
      </div>

      <EndpointFormDialog key={editSession} open={editing} onOpenChange={setEditing} endpoint={endpoint} />

      <ConfirmDialog
        open={confirm === 'rotate'}
        onOpenChange={(o) => !o && closeConfirm()}
        tone="default"
        title={t('rotate.title')}
        description={t('rotate.body')}
        confirmLabel={t('rotate.confirm')}
        onConfirm={runRotate}
        loading={rotate.isPending}
      >
        {rotate.isError && <ActionError error={rotate.error} />}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'disable'}
        onOpenChange={(o) => !o && closeConfirm()}
        title={t('disable.title')}
        description={t('disable.body')}
        confirmLabel={t('disable.confirm')}
        onConfirm={runDisable}
        loading={disable.isPending}
      >
        {!cancellable.isPending && !cancellable.error && cancelled > 0 && (
          <p className="num text-sm font-medium text-danger">{t('disable.cancels', { count: cancelled })}</p>
        )}
        {disable.isError && <ActionError error={disable.error} />}
      </ConfirmDialog>
      <Dialog open={Boolean(newSecret)} onOpenChange={(o) => !o && setNewSecret(null)}>
        <DialogContent
          title={t('rotate.newTitle')}
          description={t('rotate.newBody')}
          onInteractOutside={(e) => e.preventDefault()}
          footer={
            <Button variant="primary" onClick={() => setNewSecret(null)}>
              {t('form.stored')}
            </Button>
          }
        >
          {newSecret && <SecretReveal label={t('form.secretLabel')} secret={newSecret} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
