import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // 4xx answers won't change by asking again; only retry network/5xx failures.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 429)
          return failureCount < 1 && error.retryAfter !== undefined
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
      retryDelay: (attempt, error) =>
        error instanceof ApiError && error.retryAfter !== undefined
          ? Math.min(error.retryAfter, 60) * 1000
          : Math.min(1000 * 2 ** attempt, 30_000),
    },
    mutations: {
      // Financial commands are retried by the person (with the same idempotency key), never silently.
      retry: false,
    },
  },
})
