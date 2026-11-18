import { Dialog as DialogPrimitive } from 'radix-ui'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useTheme } from '@/lib/theme'
import { CommandMenu } from '../CommandMenu'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  useGlobalShortcuts(() => setSearchOpen((o) => !o))

  // Each page starts at the top, like a real navigation.
  useEffect(() => window.scrollTo(0, 0), [location.pathname])

  return (
    <div className="min-h-dvh">
      {/* Simulator marker: always visible, never dismissible. */}
      <div className="hatch-sim fixed inset-x-0 top-0 z-40 h-[3px]" aria-hidden="true" />

      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-canvas pt-[3px] lg:block">
        <Sidebar />
      </aside>

      <DialogPrimitive.Root open={navOpen} onOpenChange={setNavOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fp-fade fixed inset-0 z-50 bg-ink/30 lg:hidden" />
          <DialogPrimitive.Content className="fp-slide-in fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-canvas lg:hidden">
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Main navigation</DialogPrimitive.Description>
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="pt-[3px] lg:pl-60">
        <Topbar onOpenNav={() => setNavOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}

/** ⌘K / Ctrl+K opens the command menu; ⇧D toggles the theme (outside text fields). */
function useGlobalShortcuts(toggleSearch: () => void) {
  const toggleTheme = useTheme((s) => s.toggle)
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        toggleSearch()
      } else if (!typing && event.shiftKey && event.key === 'D') {
        toggleTheme()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSearch, toggleTheme])
}
