import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { merchantApi } from './api'

export const merchantKeys = { profile: ['merchant'] as const }

export function useMerchant() {
  return useQuery({
    queryKey: merchantKeys.profile,
    queryFn: ({ signal }) => merchantApi.get(signal),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateMerchant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: merchantApi.update,
    onSuccess: (merchant) => queryClient.setQueryData(merchantKeys.profile, merchant),
  })
}
