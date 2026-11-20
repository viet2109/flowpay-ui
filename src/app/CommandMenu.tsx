import {
  ArrowRightIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
  KeyIcon,
  MoonIcon,
  PaperPlaneTiltIcon,
  ReceiptIcon,
  SquaresFourIcon,
  TranslateIcon,
  WebhooksLogoIcon,
  type Icon,
} from '@phosphor-icons/react'
import { Command } from 'cmdk'
import type { ParseKeys } from 'i18next'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { LANGUAGE_NAMES, setLanguage, useFormat, useLanguage } from '@/i18n'
import { useRecentItems, type RecentItem } from '@/lib/recent-items'
import { useTheme } from '@/lib/theme'
import { commandFilter, parseId, type IdTarget } from './command-search'

interface Entry {
  label: string
  icon: Icon
  run: () => void
  /** English and translated synonyms, so either language finds the entry. */
  keywords?: string[]
}

const ID_LABEL: Record<IdTarget['kind'], ParseKeys<'shell'>> = {
  payment: 'command.openPayment',
  endpoint: 'command.openEndpoint',
  delivery: 'command.openDelivery',
}

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('shell')
  const fmt = useFormat()
  const navigate = useNavigate()
  const toggleTheme = useTheme((s) => s.toggle)
  const language = useLanguage()
  const otherLanguage = language === 'vi' ? 'en' : 'vi'
  const recent = useRecentItems((s) => s.items)
  const [search, setSearch] = useState('')

  const go = (fn: () => void) => () => {
    fn()
    onOpenChange(false)
    setSearch('')
  }
  /** Synonyms in this language plus the English ones, so either language finds the entry. */
  const words = (key: ParseKeys<'shell'>) => [
    ...new Set([...t(key).split(' '), ...t(key, { lng: 'en' }).split(' ')]),
  ]

  const pages: Entry[] = [
    {
      label: t('nav.overview'),
      icon: SquaresFourIcon,
      run: () => navigate('/'),
      keywords: words('command.keywords.overview'),
    },
    {
      label: t('nav.payments'),
      icon: ReceiptIcon,
      run: () => navigate('/payments'),
      keywords: words('command.keywords.payments'),
    },
    {
      label: t('command.failedPayments'),
      icon: ReceiptIcon,
      run: () => navigate('/payments?status=FAILED'),
      keywords: words('command.keywords.failedPayments'),
    },
    {
      label: t('nav.apiKeys'),
      icon: KeyIcon,
      run: () => navigate('/developers/api-keys'),
      keywords: words('command.keywords.apiKeys'),
    },
    {
      label: t('command.webhookEndpoints'),
      icon: WebhooksLogoIcon,
      run: () => navigate('/developers/webhooks'),
      keywords: words('command.keywords.webhooks'),
    },
    {
      label: t('command.deadDeliveries'),
      icon: PaperPlaneTiltIcon,
      run: () => navigate('/developers/webhooks/deliveries?status=DEAD'),
      keywords: words('command.keywords.deadDeliveries'),
    },
    {
      label: t('nav.settings'),
      icon: GearSixIcon,
      run: () => navigate('/settings'),
      keywords: words('command.keywords.settings'),
    },
  ]

  const idTarget = parseId(search)
  const recentLabel = (item: RecentItem) =>
    item.kind === 'payment'
      ? `${item.orderId ?? item.id} · ${fmt.moneyWithCode(item.amount, item.currency)}`
      : item.url.replace(/^https?:\/\//, '')
  const recentPath = (item: RecentItem) =>
    item.kind === 'payment' ? `/payments/${item.id}` : `/developers/webhooks/${item.id}`

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fp-fade fixed inset-0 z-50 bg-ink/25" />
        <DialogPrimitive.Content className="fp-pop fixed top-[15vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
          <DialogPrimitive.Title className="sr-only">{t('command.title')}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {t('command.description')}
          </DialogPrimitive.Description>
          <Command
            loop
            filter={commandFilter}
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-3"
          >
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={t('command.placeholder')}
              className="h-11 w-full border-b border-line bg-transparent px-4 text-sm outline-none placeholder:text-ink-3"
            />
            <Command.List label={t('command.suggestions')} className="max-h-80 overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-sm text-ink-3">
                {t('command.empty')}
              </Command.Empty>
              {idTarget && (
                <Command.Group heading={t('command.jumpTo')}>
                  {/* The value is the search itself, so the filter always keeps this item. */}
                  <Item value={search} icon={ArrowRightIcon} onSelect={go(() => navigate(idTarget.to))}>
                    {t(ID_LABEL[idTarget.kind])}{' '}
                    <span className="font-mono text-xs text-ink-3">{idTarget.id}</span>
                  </Item>
                </Command.Group>
              )}
              {recent.length > 0 && (
                <Command.Group heading={t('command.recent')}>
                  {recent.map((item) => (
                    <Item
                      key={item.id}
                      value={`${recentLabel(item)} ${item.id}`}
                      icon={item.kind === 'payment' ? ReceiptIcon : WebhooksLogoIcon}
                      onSelect={go(() => navigate(recentPath(item)))}
                    >
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span className="num truncate">{recentLabel(item)}</span>
                        <ClockCounterClockwiseIcon className="size-3.5 shrink-0 text-ink-3" />
                      </span>
                    </Item>
                  ))}
                </Command.Group>
              )}
              <Command.Group heading={t('command.pages')}>
                {pages.map((p) => (
                  <Item
                    key={p.label}
                    value={p.label}
                    keywords={p.keywords}
                    icon={p.icon}
                    onSelect={go(p.run)}
                  >
                    {p.label}
                  </Item>
                ))}
              </Command.Group>
              <Command.Group heading={t('command.preferences')}>
                <Item
                  value={t('command.toggleDarkMode')}
                  keywords={words('command.keywords.theme')}
                  icon={MoonIcon}
                  onSelect={go(toggleTheme)}
                >
                  {t('command.toggleDarkMode')}
                </Item>
                <Item
                  value={t('language.switchTo', { name: LANGUAGE_NAMES[otherLanguage] })}
                  keywords={words('command.keywords.language')}
                  icon={TranslateIcon}
                  onSelect={go(() => void setLanguage(otherLanguage))}
                >
                  {t('language.switchTo', { name: LANGUAGE_NAMES[otherLanguage] })}
                </Item>
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Item({
  value,
  keywords,
  icon: IconCmp,
  onSelect,
  children,
}: {
  value: string
  keywords?: string[]
  icon: Icon
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      onSelect={onSelect}
      className="flex h-9 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm text-ink-2 data-[selected=true]:bg-surface-hover data-[selected=true]:text-ink"
    >
      <IconCmp className="size-4 shrink-0 text-ink-3" />
      {children}
    </Command.Item>
  )
}
