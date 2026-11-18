import type { ReactNode } from 'react'
import { useTestKey } from '../store'
import { ConnectKeyPanel } from './ConnectKeyPanel'

/** Renders children only when a test key is connected. */
export function RequireTestKey({ children }: { children: ReactNode }) {
  const key = useTestKey((s) => s.key)
  return key ? <>{children}</> : <ConnectKeyPanel />
}
