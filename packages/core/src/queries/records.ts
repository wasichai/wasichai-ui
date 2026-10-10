import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { changeReasonHeader } from '../lib/changeReason'
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

// a bare payload still works; the wrapper adds the change reason. a payload always has attributes, the wrapper never
export type SaveRecordInput = RecordPayload | { payload: RecordPayload; reason?: string | null }
export type DeleteRecordInput = string | { id: string; reason?: string | null }

// a section left out is left alone by the server; one value sent as null is cleared
export function useSaveRecord(objectName: string, id?: string) {
  const queryClient = useQueryClient()
  const invalidateModules = useModuleQueryInvalidation()
  return useMutation({
    mutationFn: (input: SaveRecordInput) => {
      const { payload, reason } = 'attributes' in input ? { payload: input, reason: undefined } : input
      return api<RecordItem>(id ? `/objects/${objectName}/records/${id}` : `/objects/${objectName}/records`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
        headers: changeReasonHeader(reason)
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['records', objectName] })
      if (id) void queryClient.invalidateQueries({ queryKey: ['record', objectName, id] })
      // the update is a history entry, and the history tab stays mounted next to the form
      if (id) void queryClient.invalidateQueries({ queryKey: ['history', objectName, id] })
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
    mutationFn: (input: DeleteRecordInput) => {
      const { id, reason } = typeof input === 'string' ? { id: input, reason: undefined } : input
      return api<void>(`/objects/${objectName}/records/${id}`, { method: 'DELETE', headers: changeReasonHeader(reason) })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['records', objectName] })
      void queryClient.invalidateQueries({ queryKey: ['related'] })
      invalidateModules(objectName)
    }
  })
}
