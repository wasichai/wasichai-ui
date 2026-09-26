import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { View, ViewPayload } from '../types/metadata'

// never empty: with nothing stored the server answers with one generated default view
export function useViews(objectName: string | undefined) {
  return useQuery({
    queryKey: ['views', objectName],
    queryFn: () => api<View[]>(`/objects/${objectName}/views`),
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
