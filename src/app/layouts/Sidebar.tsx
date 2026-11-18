import {
  GearSixIcon,
  KeyIcon,
  ReceiptIcon,
  SquaresFourIcon,
  WebhooksLogoIcon,
  type Icon,
} from '@phosphor-icons/react'
import { NavLink } from 'react-router'
import { Logo } from '@/components/logo'
import { useSession } from '@/features/auth'
import { useMerchant } from '@/features/merchant'
import { cn } from '@/lib/cn'
import { humanize } from '@/lib/format'

interface NavItem {
  to: string
  label: string
  icon: Icon
  end?: boolean
}

const sections: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/', label: 'Overview', icon: SquaresFourIcon, end: true },
      { to: '/payments', label: 'Payments', icon: ReceiptIcon },
    ],
  },
  {
    title: 'Developers',
    items: [
      { to: '/developers/api-keys', label: 'API keys', icon: KeyIcon },
      { to: '/developers/webhooks', label: 'Webhooks', icon: WebhooksLogoIcon },
    ],
  },
]

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
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
          {item.label}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: merchant } = useMerchant()
  const role = useSession((s) => s.user?.role)
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
          <div className="text-xs text-ink-3">{role ? humanize(role) : ' '}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5" aria-label="Main">
        {sections.map((section, i) => (
          <div key={i} className="space-y-0.5">
            {section.title && (
              <div className="px-2.5 pb-1 text-xs font-medium text-ink-3">{section.title}</div>
            )}
            {section.items.map((item) => (
              <NavRow key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <NavRow item={{ to: '/settings', label: 'Settings', icon: GearSixIcon }} onNavigate={onNavigate} />
    </div>
  )
}
