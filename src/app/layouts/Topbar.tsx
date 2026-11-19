import {
  ListIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
  UserIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { Tooltip } from '@/components/ui/tooltip'
import { logout, useSession } from '@/features/auth'
import { keyPrefix, useTestKey } from '@/features/test-mode'
import { LANGUAGE_NAMES, setLanguage, useLanguage } from '@/i18n'
import { useTheme } from '@/lib/theme'
import { signOutLocally } from '../http-setup'

export function Topbar({ onOpenNav, onOpenSearch }: { onOpenNav: () => void; onOpenSearch: () => void }) {
  const user = useSession((s) => s.user)
  const testKey = useTestKey((s) => s.key)
  const toggleTheme = useTheme((s) => s.toggle)
  const navigate = useNavigate()
  const { t } = useTranslation('shell')
  const language = useLanguage()
  const otherLanguage = language === 'vi' ? 'en' : 'vi'
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)

  async function signOut() {
    await logout().catch(() => undefined)
    signOutLocally()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-canvas/85 px-4 backdrop-blur-sm lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label={t('topbar.openNavigation')}
      >
        <ListIcon />
      </Button>

      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-8 w-full max-w-72 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-sm text-ink-3 hover:border-line-strong"
      >
        <MagnifyingGlassIcon className="size-4" />
        <span className="flex-1 text-left">{t('topbar.jumpTo')}</span>
        <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
        <Kbd>K</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip
          content={testKey ? t('topbar.testModeKey', { key: keyPrefix(testKey) }) : t('topbar.testModeNoKey')}
        >
          <span className="hidden items-center gap-1.5 rounded-sm border border-sim/50 bg-sim/10 px-2 py-0.5 text-xs font-medium text-sim-ink sm:inline-flex">
            <span className="hatch-sim size-2 rounded-[2px]" />
            {t('topbar.testMode')}
          </span>
        </Tooltip>

        <Tooltip content={t('language.switchTo', { name: LANGUAGE_NAMES[otherLanguage] })}>
          <Button
            variant="ghost"
            size="icon"
            className="font-mono text-xs"
            onClick={() => void setLanguage(otherLanguage)}
            aria-label={`${t('language.current', { name: LANGUAGE_NAMES[language] })}. ${t('language.switchTo', { name: LANGUAGE_NAMES[otherLanguage] })}`}
          >
            {language.toUpperCase()}
          </Button>
        </Tooltip>

        <Tooltip content={t('topbar.toggleThemeShortcut')}>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t('topbar.toggleTheme')}>
            <SunIcon className="hidden dark:block" />
            <MoonIcon className="dark:hidden" />
          </Button>
        </Tooltip>

        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('topbar.account')}>
              <UserIcon />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuLabel>
              <span className="block truncate text-sm text-ink">{user?.email ?? user?.id}</span>
            </MenuLabel>
            <MenuSeparator />
            <MenuItem onSelect={() => navigate('/settings')}>
              <UserIcon />
              {t('nav.settings')}
            </MenuItem>
            <MenuItem onSelect={signOut}>
              <SignOutIcon />
              {t('topbar.signOut')}
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </header>
  )
}
