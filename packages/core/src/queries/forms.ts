import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Form, FormPayload } from '../types/metadata'

export function useForms(objectName: string | undefined) {
  return useQuery({
    queryKey: ['forms', objectName],
    queryFn: () => api<Form[]>(`/objects/${objectName}/forms`),
    enabled: Boolean(objectName)
  })
}

export function useStoredForm(objectName: string | undefined, name: string | undefined) {
  return useQuery({
    queryKey: ['form', objectName, name],
    queryFn: () => api<Form>(`/objects/${objectName}/forms/${name}`),
    enabled: Boolean(objectName && name)
  })
}

export function useSaveStoredForm(objectName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ generated, form }: { generated: boolean; form: FormPayload }) =>
      generated
        ? api<Form>(`/objects/${objectName}/forms`, {
            method: 'POST',
            body: JSON.stringify(form)
          })
        : api<Form>(`/objects/${objectName}/forms/${form.name}`, {
            method: 'PUT',
            body: JSON.stringify({ label: form.label, definition: form.definition })
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['forms', objectName] })
      void queryClient.invalidateQueries({ queryKey: ['form', objectName] })
      // pages embed forms by name. what they render just changed.
      void queryClient.invalidateQueries({ queryKey: ['page'] })
    }
  })
}

export function useDeleteForm(objectName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api<void>(`/objects/${objectName}/forms/${name}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['forms', objectName] })
      void queryClient.invalidateQueries({ queryKey: ['form', objectName] })
      void queryClient.invalidateQueries({ queryKey: ['page'] })
    }
  })
}
