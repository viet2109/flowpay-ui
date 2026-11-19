import { useTranslation } from 'react-i18next'
import {
  ArrowRightIcon,
  GearSixIcon,
  KeyIcon,
  MoonIcon,
  PaperPlaneTiltIcon,
  ReceiptIcon,
  SquaresFourIcon,
  WebhooksLogoIcon,
  type Icon,
} from '@phosphor-icons/react'
import { Command } from 'cmdk'
import type { ParseKeys } from 'i18next'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTheme } from '@/lib/theme'

interface Entry {
  label: string
  icon: Icon
  run: () => void
  keywords?: string[]
}

/** IDs carry their type in the prefix, so pasting one is enough to jump to it. */
const ID_ROUTES: { prefix: string; label: ParseKeys<'shell'>; to: (id: string) => string }[] = [
  { prefix: 'pi_', label: 'command.openPayment', to: (id) => `/payments/${id}` },
  { prefix: 'wep_', label: 'command.openEndpoint', to: (id) => `/developers/webhooks/${id}` },
]

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('shell')
  const navigate = useNavigate()
  const toggleTheme = useTheme((s) => s.toggle)
  const [search, setSearch] = useState('')

  const go = (fn: () => void) => () => {
    fn()
    onOpenChange(false)
    setSearch('')
  }

  const pages: Entry[] = [
    { label: t('nav.overview'), icon: SquaresFourIcon, run: () => navigate('/') },
    {
      label: t('nav.payments'),
      icon: ReceiptIcon,
      run: () => navigate('/payments'),
      keywords: ['refunds', 'transactions'],
    },
    {
      label: t('command.failedPayments'),
      icon: ReceiptIcon,
      run: () => navigate('/payments?status=FAILED'),
      keywords: ['declined'],
    },
    {
      label: t('nav.apiKeys'),
      icon: KeyIcon,
      run: () => navigate('/developers/api-keys'),
      keywords: ['secret', 'token'],
    },
    {
      label: t('command.webhookEndpoints'),
      icon: WebhooksLogoIcon,
      run: () => navigate('/developers/webhooks'),
    },
    {
      label: t('command.deadDeliveries'),
      icon: PaperPlaneTiltIcon,
      run: () => navigate('/developers/webhooks/deliveries?status=DEAD'),
      keywords: ['retry', 'failed'],
    },
    {
      label: t('nav.settings'),
      icon: GearSixIcon,
      run: () => navigate('/settings'),
      keywords: ['profile', 'business'],
    },
  ]

  const trimmed = search.trim()
  const idMatch = ID_ROUTES.find((r) => trimmed.startsWith(r.prefix) && trimmed.length > r.prefix.length + 3)

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
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-3"
          >
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={t('command.placeholder')}
              className="h-11 w-full border-b border-line bg-transparent px-4 text-sm outline-none placeholder:text-ink-3"
            />
            <Command.List className="max-h-80 overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-sm text-ink-3">
                {t('command.empty')}
              </Command.Empty>
              {idMatch && (
                <Command.Group heading={t('command.jumpTo')}>
                  <Item
                    value={`id ${trimmed}`}
                    icon={ArrowRightIcon}
                    onSelect={go(() => navigate(idMatch.to(trimmed)))}
                  >
                    {t(idMatch.label)} <span className="font-mono text-xs text-ink-3">{trimmed}</span>
                  </Item>
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
                  keywords={['theme', 'light']}
                  icon={MoonIcon}
                  onSelect={go(toggleTheme)}
                >
                  {t('command.toggleDarkMode')}
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
  children: React.ReactNode
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      onSelect={onSelect}
      className="flex h-9 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm text-ink-2 data-[selected=true]:bg-surface-hover data-[selected=true]:text-ink"
    >
      <IconCmp className="size-4 text-ink-3" />
      {children}
    </Command.Item>
  )
}
