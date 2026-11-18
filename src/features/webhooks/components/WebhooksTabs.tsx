import { NavLink } from 'react-router'
import { cn } from '@/lib/cn'

const tabs = [
  { to: '/developers/webhooks', label: 'Endpoints', end: true },
  { to: '/developers/webhooks/deliveries', label: 'Deliveries', end: false },
]

export function WebhooksTabs() {
  return (
    <nav className="flex gap-5 border-b border-line" aria-label="Webhooks">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              '-mb-px border-b-2 pb-2 text-sm transition-colors',
              isActive ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-3 hover:text-ink',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
