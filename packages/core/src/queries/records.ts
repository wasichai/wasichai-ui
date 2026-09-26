import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Paged, RecordItem, RecordPayload } from '../types/metadata'
import { useModuleQueryInvalidation } from './moduleQueries'

export function useRecords(objectName: string | undefined, params: Record<string, string>) {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined)).toString()
  return useQuery({
    queryKey: ['records', objectName, search],
    queryFn: () => api<Paged<RecordItem>>(`/objects/${objectName}/records?${search}`),
    enabled: Boolean(objectName)
  })
}

export function useRecord(objectName: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: ['record', objectName, id],
    queryFn: () => api<RecordItem>(`/objects/${objectName}/records/${id}`),
    enabled: Boolean(objectName && id)
  })
}

// a section left out is left alone by the server; one value sent as null is cleared
export function useSaveRecord(objectName: string, id?: string) {
  const queryClient = useQueryClient()
  const invalidateModules = useModuleQueryInvalidation()
  return useMutation({
    mutationFn: (payload: RecordPayload) =>
      api<RecordItem>(id ? `/objects/${objectName}/records/${id}` : `/objects/${objectName}/records`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['records', objectName] })
      if (id) void queryClient.invalidateQueries({ queryKey: ['record', objectName, id] })
      // a relation field is a link: related lists on both sides are now stale
      void queryClient.invalidateQueries({ queryKey: ['related'] })
      invalidateModules(objectName)
    }
  })
}

export function useDeleteRecord(objectName: string) {
  const queryClient = useQueryClient()
  const invalidateModules = useModuleQueryInvalidation()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/objects/${objectName}/records/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['records', objectName] })
      void queryClient.invalidateQueries({ queryKey: ['related'] })
      invalidateModules(objectName)
    }
  })
}
