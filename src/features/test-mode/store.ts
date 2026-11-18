import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * The backend only exposes Payment/Refund APIs to merchant API keys
 * (docs/api-contract.md §11–12), not to dashboard JWTs. To show payments in the
 * dashboard, a person connects one of their *test* keys for this browser tab.
 *
 * Trade-off, deliberately accepted for a simulator: the key sits in
 * sessionStorage (cleared when the tab closes) and is never bundled or sent
 * anywhere but FlowPay. When the backend gains JWT-scoped read endpoints, delete
 * this feature and switch payments/api.ts to `auth: 'dashboard'`.
 */
interface TestKeyState {
  key: string | null
  /** Display name of the key, when connected right after creation. */
  label: string | null
  connect: (key: string, label?: string | null) => void
  disconnect: () => void
}

export const useTestKey = create<TestKeyState>()(
  persist(
    (set) => ({
      key: null,
      label: null,
      connect: (key, label = null) => set({ key: key.trim(), label }),
      disconnect: () => set({ key: null, label: null }),
    }),
    { name: 'flowpay.testKey', storage: createJSONStorage(() => sessionStorage) },
  ),
)

export const testKeySnapshot = () => useTestKey.getState().key

/** "fp_test_A7xQ…" style prefix for display. */
export function keyPrefix(key: string) {
  return key.length > 14 ? `${key.slice(0, 12)}…` : key
}
