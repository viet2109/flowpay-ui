import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiKeysApi, type ApiKey } from './api'

export const apiKeyKeys = { list: ['api-keys'] as const }

export function useApiKeys() {
  return useQuery({ queryKey: apiKeyKeys.list, queryFn: ({ signal }) => apiKeysApi.list(signal) })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: apiKeysApi.create,
    onSettled: () => queryClient.invalidateQueries({ queryKey: apiKeyKeys.list }),
  })
}

/** Optimistic: the row flips to REVOKED immediately and rolls back on failure. */
export function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: apiKeysApi.revoke,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: apiKeyKeys.list })
      const previous = queryClient.getQueryData<ApiKey[]>(apiKeyKeys.list)
      queryClient.setQueryData<ApiKey[]>(apiKeyKeys.list, (keys) =>
        keys?.map((k) => (k.id === id ? { ...k, status: 'REVOKED' } : k)),
      )
      return { previous }
    },
    onError: (_error, _id, context) => queryClient.setQueryData(apiKeyKeys.list, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: apiKeyKeys.list }),
  })
}
