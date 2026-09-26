import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Page, PagePayload, PageTemplate } from '../types/metadata'

// 404s when the backend has no pages module; RecordDetailPage then draws fallbackPage (R8)
export function useResolvedPage(objectName: string | undefined) {
  return useQuery({
    queryKey: ['page', objectName],
    queryFn: () => api<Page>(`/objects/${objectName}/pages/record-detail`),
    enabled: Boolean(objectName)
  })
}

// the catalogue is code on the server, the same nine templates for every tenant -- it never changes
// while the app is open, so cache it forever instead of refetching it on every page builder visit.
export function useTemplates() {
  return useQuery({
    queryKey: ['page-templates'],
    queryFn: () => api<PageTemplate[]>('/metadata/page-templates'),
    staleTime: Infinity
  })
}

export function usePages() {
  return useQuery({
    queryKey: ['pages'],
    queryFn: () => api<Page[]>('/pages')
  })
}

// a generated page has nothing stored yet, so saving it creates; anything else updates
export function useSavePage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ generated, page }: { generated: boolean; page: PagePayload }) =>
      generated
        ? api<Page>('/pages', { method: 'POST', body: JSON.stringify(page) })
        : api<Page>(`/pages/${page.name}`, {
            method: 'PUT',
            body: JSON.stringify({
              label: page.label,
              template: page.template,
              definition: page.definition
            })
          }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['pages'] })
      void queryClient.invalidateQueries({ queryKey: ['page', saved.objectName] })
    }
  })
}

// deleting the stored page is "reset to default": the resolved one goes back to generated
export function useDeletePage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name }: { name: string; objectName: string }) => api<void>(`/pages/${name}`, { method: 'DELETE' }),
    onSuccess: (_result, { objectName }) => {
      void queryClient.invalidateQueries({ queryKey: ['pages'] })
      void queryClient.invalidateQueries({ queryKey: ['page', objectName] })
    }
  })
}
