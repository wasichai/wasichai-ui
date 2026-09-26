import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Paged, RecordItem, RelatedSide, Relationship } from '../types/metadata'

export function useRelationships() {
  return useQuery({
    queryKey: ['relationships'],
    queryFn: () => api<Relationship[]>('/relationships')
  })
}

export function useObjectRelationships(objectName: string | undefined) {
  return useQuery({
    queryKey: ['relationships', objectName],
    queryFn: () => api<RelatedSide[]>(`/objects/${objectName}/relationships`),
    enabled: Boolean(objectName)
  })
}

export function useRelatedRecords(objectName: string | undefined, recordId: string | undefined, relationship: string | undefined) {
  return useQuery({
    queryKey: ['related', objectName, recordId, relationship],
    queryFn: () => api<Paged<RecordItem>>(`/objects/${objectName}/records/${recordId}/related/${relationship}?size=25`),
    enabled: Boolean(objectName && recordId && relationship)
  })
}

export function useCreateRelationship() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: unknown) => api<Relationship>('/relationships', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['relationships'] })
      void queryClient.invalidateQueries({ queryKey: ['objects'] })
    }
  })
}

// only the labels: what backs a relationship never moves. the key is a parent of the per-object
// one, so this clears both, and ['objects'] too because a label shows up beside its field.
export function useUpdateRelationship() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, payload }: { name: string; payload: { label?: string; inverseLabel?: string | null } }) =>
      api<Relationship>(`/relationships/${name}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['relationships'] })
      void queryClient.invalidateQueries({ queryKey: ['objects'] })
    }
  })
}

export function useDeleteRelationship() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api<void>(`/relationships/${name}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['relationships'] })
      void queryClient.invalidateQueries({ queryKey: ['objects'] })
    }
  })
}

// link/unlink only apply to many-to-many; the other kinds are a field on the record
export function useLinkRelated(objectName: string, recordId: string, relationship: string) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['related', objectName, recordId, relationship] })

  return {
    link: useMutation({
      mutationFn: (otherId: string) =>
        api<void>(`/objects/${objectName}/records/${recordId}/related/${relationship}`, {
          method: 'POST',
          body: JSON.stringify({ otherId })
        }),
      onSuccess: invalidate
    }),
    unlink: useMutation({
      mutationFn: (otherId: string) => api<void>(`/objects/${objectName}/records/${recordId}/related/${relationship}/${otherId}`, { method: 'DELETE' }),
      onSuccess: invalidate
    })
  }
}
