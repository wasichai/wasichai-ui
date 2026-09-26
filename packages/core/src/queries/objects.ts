import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { FieldMeta, ObjectDefinition, ObjectSummary, SystemField } from '../types/metadata'
import { useModuleQueryInvalidation } from './moduleQueries'

export function useObjects() {
  return useQuery({
    queryKey: ['objects'],
    queryFn: () => api<ObjectSummary[]>('/objects')
  })
}

export function useObjectDefinition(name: string | undefined) {
  return useQuery({
    queryKey: ['objects', name],
    queryFn: () => api<ObjectDefinition>(`/metadata/objects/${name}`),
    enabled: Boolean(name)
  })
}

// the names the platform keeps for itself. they do not change while the app is open.
export function useSystemFields() {
  return useQuery({
    queryKey: ['system-fields'],
    queryFn: () => api<SystemField[]>('/metadata/system-fields'),
    staleTime: Infinity
  })
}

export function useCreateObject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: unknown) => api<ObjectDefinition>('/objects', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['objects'] })
  })
}

export function useUpdateObject(name: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: unknown) => api<ObjectSummary>(`/objects/${name}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['objects'] })
    }
  })
}

export function useDeleteObject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api<void>(`/objects/${name}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['objects'] })
  })
}

// a field change reshapes the table, the form and whatever modules cache per object: drop all of it
function useObjectInvalidation() {
  const queryClient = useQueryClient()
  const invalidateModules = useModuleQueryInvalidation()
  return (objectName: string) => {
    void queryClient.invalidateQueries({ queryKey: ['objects', objectName] })
    void queryClient.invalidateQueries({ queryKey: ['records', objectName] })
    invalidateModules(objectName)
  }
}

export function useAddField(objectName: string) {
  const invalidate = useObjectInvalidation()
  return useMutation({
    mutationFn: (payload: unknown) => api<FieldMeta>(`/metadata/objects/${objectName}/fields`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidate(objectName)
  })
}

export function useUpdateField(objectName: string) {
  const invalidate = useObjectInvalidation()
  return useMutation({
    mutationFn: ({ field, payload }: { field: string; payload: unknown }) =>
      api<FieldMeta>(`/metadata/objects/${objectName}/fields/${field}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => invalidate(objectName)
  })
}

export function useDeleteField(objectName: string) {
  const invalidate = useObjectInvalidation()
  return useMutation({
    mutationFn: (field: string) => api<void>(`/metadata/objects/${objectName}/fields/${field}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(objectName)
  })
}
