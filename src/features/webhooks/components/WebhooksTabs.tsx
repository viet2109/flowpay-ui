import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { cn } from '@/lib/cn'

const tabs = [
  { to: '/developers/webhooks', label: 'tabs.endpoints', end: true },
  { to: '/developers/webhooks/deliveries', label: 'tabs.deliveries', end: false },
] as const

export function WebhooksTabs() {
  const { t } = useTranslation('webhooks')
  return (
    <nav className="flex gap-5 border-b border-line" aria-label={t('tabs.label')}>
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
          {t(tab.label)}
        </NavLink>
      ))}
    </nav>
  )
}
