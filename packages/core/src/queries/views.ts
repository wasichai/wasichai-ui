import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../api/client'
import type { View, ViewPayload } from '../types/metadata'

// with nothing stored the server answers one generated default view. a 404 is a server without the
// views module (ADR-028): no views, and nothing a retry would change
export function useViews(objectName: string | undefined) {
  return useQuery({
    queryKey: ['views', objectName],
    queryFn: async () => {
      try {
        return await api<View[]>(`/objects/${objectName}/views`)
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) return []
        throw cause
      }
    },
    enabled: Boolean(objectName)
  })
}

// name "default" resolves whichever view is the default one
export function useView(objectName: string | undefined, name: string | undefined) {
  return useQuery({
    queryKey: ['view', objectName, name],
    queryFn: () => api<View>(`/objects/${objectName}/views/${name}`),
    enabled: Boolean(objectName && name)
  })
}

// a generated view has nothing stored yet, so saving it creates; anything else updates
export function useSaveView(objectName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ generated, view }: { generated: boolean; view: ViewPayload }) =>
      generated
        ? api<View>(`/objects/${objectName}/views`, {
            method: 'POST',
            body: JSON.stringify(view)
          })
        : api<View>(`/objects/${objectName}/views/${view.name}`, {
            method: 'PUT',
            body: JSON.stringify({
              label: view.label,
              isDefault: view.isDefault,
              definition: view.definition
            })
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['views', objectName] })
      void queryClient.invalidateQueries({ queryKey: ['view', objectName] })
    }
  })
}

// deleting the stored view is "reset to default": the list goes back to the generated one
export function useDeleteView(objectName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api<void>(`/objects/${objectName}/views/${name}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['views', objectName] })
      void queryClient.invalidateQueries({ queryKey: ['view', objectName] })
    }
  })
}
