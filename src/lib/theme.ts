import { create } from 'zustand'

export type ThemePreference = 'system' | 'light' | 'dark'
const STORAGE_KEY = 'flowpay.theme' // also read by the inline script in index.html

function read(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function apply(preference: ThemePreference) {
  const dark = preference === 'dark' || (preference === 'system' && media().matches)
  document.documentElement.classList.toggle('dark', dark)
}

interface ThemeState {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
  toggle: () => void
}

export const useTheme = create<ThemeState>()((set, get) => ({
  preference: read(),
  setPreference: (preference) => {
    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* not persisted, still applied */
    }
    apply(preference)
    set({ preference })
  },
  toggle: () => {
    const isDark = document.documentElement.classList.contains('dark')
    get().setPreference(isDark ? 'light' : 'dark')
  },
}))

/** Follow OS changes while the preference is "system". Call once at startup. */
export function watchSystemTheme() {
  const mq = media()
  const onChange = () => useTheme.getState().preference === 'system' && apply('system')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
