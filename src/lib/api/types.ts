/** Mirrors backend `ApiResponse` / `PageMeta` (docs/api-contract.md §1). */
export interface PageMeta {
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface Page<T> {
  items: T[]
  meta: PageMeta
}

export interface PageParams {
  page?: number
  size?: number
}

/** ISO-8601 instant string as serialised by the backend. */
export type Instant = string
