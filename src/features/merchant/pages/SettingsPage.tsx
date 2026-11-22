import { DesktopIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CopyableId } from '@/components/copyable-id'
import { DescriptionList } from '@/components/description-list'
import { PageHeader } from '@/components/page-header'
import { ActionError, ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth'
import {
  LANGUAGES,
  LANGUAGE_NAMES,
  setLanguage,
  type Language,
  useFieldError,
  useFormat,
  useLanguage,
  useRoleLabel,
  vmsg,
} from '@/i18n'
import { isApiError } from '@/lib/api/errors'
import { cn } from '@/lib/cn'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { useMerchant, useUpdateMerchant } from '../queries'
import { merchantStatus } from '../status'

/** UpdateMerchantProfileRequest: name required, at most 200 characters after trimming. */
const NAME_MAX = 200

export function SettingsPage() {
  const { t } = useTranslation('merchant')
  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="max-w-3xl space-y-5">
        <BusinessPanel />
        <AccountPanel />
        <LanguagePanel />
        <AppearancePanel />
      </div>
    </>
  )
}

function BusinessPanel() {
  const { t } = useTranslation('merchant')
  const fieldError = useFieldError()
  const fmt = useFormat()
  const { data, isPending, error, refetch } = useMerchant()
  const update = useUpdateMerchant()
  const [name, setName] = useState<string | null>(null)
  const value = name ?? data?.name ?? ''
  const dirty = data !== undefined && value.trim() !== data.name
  // The server's own message for the name; any other failure keeps its requestId below.
  const nameRejection = isApiError(update.error, 'VALIDATION_ERROR')
    ? update.error.fieldErrors.find((e) => e.field === 'name')?.message
    : undefined

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!value.trim()) return
    update.mutate(value.trim(), {
      onSuccess: () => {
        setName(null)
        toast.success(t('settings.business.saved'))
      },
    })
  }

  return (
    <Panel>
      <PanelHeader title={t('settings.business.title')} description={t('settings.business.description')} />
      {isPending ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div className="p-4">
          {update.isError && !nameRejection && <ActionError error={update.error} />}
          <form
            onSubmit={submit}
            className={cn('flex items-end gap-2', update.isError && !nameRejection && 'mt-3')}
          >
            <Field
              label={t('settings.business.name')}
              className="flex-1"
              error={nameRejection ?? (!value.trim() ? fieldError(vmsg('required')) : undefined)}
            >
              <Input value={value} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Button
              type="submit"
              variant="primary"
              disabled={!dirty || !value.trim()}
              loading={update.isPending}
            >
              {t('settings.business.save')}
            </Button>
          </form>
          <DescriptionList
            className="mt-4"
            items={[
              { label: t('settings.business.id'), value: <CopyableId value={data.id} truncate={false} /> },
              {
                label: t('settings.business.status'),
                value: <StatusBadge {...merchantStatus[data.status]} />,
              },
              { label: t('settings.business.created'), value: fmt.dateTime(data.createdAt) },
            ]}
          />
        </div>
      )}
    </Panel>
  )
}

function AccountPanel() {
  const { t } = useTranslation('merchant')
  const roleLabel = useRoleLabel()
  const user = useSession((s) => s.user)
  if (!user) return null
  return (
    <Panel>
      <PanelHeader title={t('settings.account.title')} />
      <DescriptionList
        className="px-4 py-1"
        items={[
          // Known only from the sign-in response (there is no GET /me): "—" when this
          // browser has not signed in as this user before.
          { label: t('settings.account.email'), value: user.email },
          { label: t('settings.account.userId'), value: <CopyableId value={user.id} truncate={false} /> },
          { label: t('settings.account.role'), value: roleLabel(user.role) },
        ]}
      />
    </Panel>
  )
}

function LanguagePanel() {
  const { t } = useTranslation('merchant')
  const language = useLanguage()
  return (
    <Panel>
      <PanelHeader
        className="border-b-0"
        title={t('settings.language.title')}
        description={t('settings.language.description')}
        actions={
          <Segmented<Language>
            aria-label={t('settings.language.title')}
            value={language}
            onChange={(next) => void setLanguage(next)}
            options={LANGUAGES.map((value) => ({ value, label: LANGUAGE_NAMES[value] }))}
          />
        }
      />
    </Panel>
  )
}

function AppearancePanel() {
  const { t } = useTranslation('merchant')
  const { preference, setPreference } = useTheme()
  return (
    <Panel>
      <PanelHeader
        title={t('settings.appearance.title')}
        actions={
          <Segmented<ThemePreference>
            aria-label={t('settings.appearance.theme')}
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'system', label: t('settings.appearance.system') },
              { value: 'light', label: t('settings.appearance.light') },
              { value: 'dark', label: t('settings.appearance.dark') },
            ]}
          />
        }
      />
      <p className="flex items-center gap-2 px-4 py-3 text-sm text-ink-3">
        {preference === 'dark' ? <MoonIcon /> : preference === 'light' ? <SunIcon /> : <DesktopIcon />}
        <span>
          <Trans
            t={t}
            i18nKey="settings.appearance.shortcut"
            components={{ kbd: <kbd className="font-mono text-xs" /> }}
          />
        </span>
      </p>
    </Panel>
  )
}
