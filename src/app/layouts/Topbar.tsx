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
    // Signs out here and in the other tabs, even if the request fails.
    await logout().catch(() => undefined)
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-1.5 border-b border-line bg-canvas/85 px-4 backdrop-blur-sm lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label={t('topbar.openNavigation')}
      >
        <ListIcon />
      </Button>

      {/* Phones get an icon button (the label stays for screen readers); the shortcut needs a keyboard. */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex size-8 shrink-0 items-center justify-center gap-2 rounded-md border border-line bg-surface text-sm text-ink-3 hover:border-line-strong sm:h-8 sm:w-full sm:max-w-72 sm:justify-start sm:px-2.5"
      >
        <MagnifyingGlassIcon className="size-4" />
        <span className="sr-only flex-1 text-left sm:not-sr-only">{t('topbar.jumpTo')}</span>
        <Kbd className="hidden sm:inline-flex">{isMac ? '⌘' : 'Ctrl'}</Kbd>
        <Kbd className="hidden sm:inline-flex">K</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <Tooltip
          content={testKey ? t('topbar.testModeKey', { key: keyPrefix(testKey) }) : t('topbar.testModeNoKey')}
        >
          {/* Always visible, phones included: nothing here is real money. */}
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-sim/50 bg-sim/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-sim-ink">
            <span className="hatch-sim size-2 rounded-full" />
            {t('topbar.testMode')}
          </span>
        </Tooltip>

        <Tooltip content={t('language.switchTo', { name: LANGUAGE_NAMES[otherLanguage] })}>
          <Button
            variant="ghost"
            size="icon"
            className="font-mono text-xs"
            onClick={() => void setLanguage(otherLanguage)}
            aria-label={`${language.toUpperCase()}: ${t('language.current', { name: LANGUAGE_NAMES[language] })}. ${t('language.switchTo', { name: LANGUAGE_NAMES[otherLanguage] })}`}
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
