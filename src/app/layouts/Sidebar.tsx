import {
  GearSixIcon,
  KeyIcon,
  ReceiptIcon,
  SquaresFourIcon,
  WebhooksLogoIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { Logo } from '@/components/logo'
import { useSession } from '@/features/auth'
import { useMerchant } from '@/features/merchant'
import { useRoleLabel } from '@/i18n'
import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  label: ParseKeys<'shell'>
  icon: Icon
  end?: boolean
}

const sections: { title?: ParseKeys<'shell'>; items: NavItem[] }[] = [
  {
    items: [
      { to: '/', label: 'nav.overview', icon: SquaresFourIcon, end: true },
      { to: '/payments', label: 'nav.payments', icon: ReceiptIcon },
    ],
  },
  {
    title: 'nav.developers',
    items: [
      { to: '/developers/api-keys', label: 'nav.apiKeys', icon: KeyIcon },
      { to: '/developers/webhooks', label: 'nav.webhooks', icon: WebhooksLogoIcon },
    ],
  },
]

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useTranslation('shell')
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors',
          isActive
            ? 'bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--line)]'
            : 'text-ink-2 hover:bg-surface-hover hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute top-2 bottom-2 -left-3 w-0.5 rounded-full bg-accent" />}
          <item.icon className="size-4" weight={isActive ? 'fill' : 'regular'} />
          {t(item.label)}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('shell')
  const { data: merchant } = useMerchant()
  const role = useSession((s) => s.user?.role)
  const roleLabel = useRoleLabel()
  const initials = (merchant?.name ?? '··')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <div className="px-2.5">
        <Logo />
      </div>

      <div className="flex items-center gap-2.5 rounded-md border border-line bg-surface px-2.5 py-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-ink text-xs font-semibold text-ink-inverse">
          {initials}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{merchant?.name ?? 'Loading…'}</div>
          <div className="text-xs text-ink-3">{role ? roleLabel(role) : ' '}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5" aria-label={t('nav.main')}>
        {sections.map((section, i) => (
          <div key={i} className="space-y-0.5">
            {section.title && (
              <div className="px-2.5 pb-1 text-xs font-medium text-ink-3">{t(section.title)}</div>
            )}
            {section.items.map((item) => (
              <NavRow key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <NavRow item={{ to: '/settings', label: 'nav.settings', icon: GearSixIcon }} onNavigate={onNavigate} />
    </div>
  )
}
