import { DesktopIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { CopyableId } from '@/components/copyable-id'
import { DescriptionList } from '@/components/description-list'
import { PageHeader } from '@/components/page-header'
import { ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth'
import { keyPrefix, useTestKey } from '@/features/test-mode'
import { errorMessage } from '@/lib/api/errors'
import { formatDateTime, humanize } from '@/lib/format'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { useMerchant, useUpdateMerchant } from '../queries'
import { merchantStatus } from '../status'

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-3xl space-y-5">
        <BusinessPanel />
        <AccountPanel />
        <TestKeyPanel />
        <AppearancePanel />
      </div>
    </>
  )
}

function BusinessPanel() {
  const { data, isPending, error, refetch } = useMerchant()
  const update = useUpdateMerchant()
  const [name, setName] = useState<string | null>(null)
  const value = name ?? data?.name ?? ''
  const dirty = data !== undefined && value.trim() !== data.name

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!value.trim()) return
    update.mutate(value.trim(), {
      onSuccess: () => {
        setName(null)
        toast.success('Business name updated')
      },
    })
  }

  return (
    <Panel>
      <PanelHeader title="Business" description="The merchant that owns your payments, keys and webhooks." />
      {isPending ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div className="p-4">
          <form onSubmit={submit} className="flex items-end gap-2">
            <Field
              label="Business name"
              className="flex-1"
              error={
                update.isError ? errorMessage(update.error) : !value.trim() ? 'Name is required.' : undefined
              }
            >
              <Input value={value} maxLength={200} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Button
              type="submit"
              variant="primary"
              disabled={!dirty || !value.trim()}
              loading={update.isPending}
            >
              Save
            </Button>
          </form>
          <DescriptionList
            className="mt-4"
            items={[
              { label: 'Merchant ID', value: <CopyableId value={data.id} truncate={false} /> },
              { label: 'Status', value: <StatusBadge {...merchantStatus[data.status]} /> },
              { label: 'Created', value: formatDateTime(data.createdAt) },
            ]}
          />
        </div>
      )}
    </Panel>
  )
}

function AccountPanel() {
  const user = useSession((s) => s.user)
  if (!user) return null
  return (
    <Panel>
      <PanelHeader title="Your account" />
      <DescriptionList
        className="px-4 py-1"
        items={[
          { label: 'Email', value: user.email },
          { label: 'User ID', value: <CopyableId value={user.id} truncate={false} /> },
          { label: 'Role', value: humanize(user.role) },
        ]}
      />
    </Panel>
  )
}

function TestKeyPanel() {
  const { key, label, disconnect } = useTestKey()
  return (
    <Panel>
      <PanelHeader
        title="Dashboard test key"
        description="Used only by this browser tab to read payments through the Merchant API."
        actions={
          key && (
            <Button size="sm" variant="danger-outline" onClick={disconnect}>
              Disconnect
            </Button>
          )
        }
      />
      <div className="px-4 py-3 text-sm">
        {key ? (
          <span className="flex items-center gap-2">
            <code className="font-mono text-xs">{keyPrefix(key)}</code>
            {label && <span className="text-ink-3">· {label}</span>}
          </span>
        ) : (
          <span className="text-ink-3">No key connected.</span>
        )}
      </div>
    </Panel>
  )
}

function AppearancePanel() {
  const { preference, setPreference } = useTheme()
  return (
    <Panel>
      <PanelHeader
        title="Appearance"
        actions={
          <Segmented<ThemePreference>
            aria-label="Theme"
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        }
      />
      <p className="flex items-center gap-2 px-4 py-3 text-sm text-ink-3">
        {preference === 'dark' ? <MoonIcon /> : preference === 'light' ? <SunIcon /> : <DesktopIcon />}
        Shortcut: press <kbd className="font-mono text-xs">⇧ D</kbd> anywhere to toggle.
      </p>
    </Panel>
  )
}
