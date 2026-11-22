import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { restoreSession, startProactiveRefresh } from '@/features/auth'
import { i18nReady } from '@/i18n'
import { watchSystemTheme } from '@/lib/theme'
import { App } from './app/App'
import { forgetLegacyTestKey, setupHttp, watchSessionEnd } from './app/http-setup'
import './styles/globals.css'

forgetLegacyTestKey()
setupHttp()
watchSessionEnd()
watchSystemTheme()
startProactiveRefresh()
// Outside React on purpose: StrictMode double-runs effects, and two concurrent
// refreshes would race on the rotating refresh cookie.
void restoreSession()

// The reader's language is loaded first, so the first paint is already translated.
await i18nReady

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
