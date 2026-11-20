import { create } from 'zustand'

/**
 * Records the person opened recently, for the command menu. Raw fields only;
 * labels are formatted when shown, so they follow the UI language. Kept in
 * localStorage so a reload keeps them, and cleared when the session ends so
 * merchant data does not stay on a shared computer.
 */
export type RecentItem =
  | { kind: 'payment'; id: string; orderId: string | null; amount: number; currency: string }
  | { kind: 'endpoint'; id: string; url: string }

const KEY = 'flowpay.recent'
const MAX = 5

function load(): RecentItem[] {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(items) ? (items as RecentItem[]).slice(0, MAX) : []
  } catch {
    return []
  }
}

function save(items: RecentItem[]) {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items))
    else localStorage.removeItem(KEY)
  } catch {
    /* not persisted: the list lasts for this page only */
  }
}

interface RecentState {
  items: RecentItem[]
  /** Moves the record to the top (most recent first), keeping at most five. */
  remember: (item: RecentItem) => void
  clear: () => void
}

export const useRecentItems = create<RecentState>()((set, get) => ({
  items: load(),
  remember: (item) => {
    const items = [item, ...get().items.filter((existing) => existing.id !== item.id)].slice(0, MAX)
    save(items)
    set({ items })
  },
  clear: () => {
    save([])
    set({ items: [] })
  },
}))
