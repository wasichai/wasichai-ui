import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@wasichai/core'
import type { DocumentType, DocumentTypePayload, IssuedDocument } from './types'

export function useDocumentTypes(objectName: string | undefined) {
  return useQuery({
    queryKey: ['document-types', objectName],
    queryFn: () => api<DocumentType[]>(`/objects/${objectName}/document-types`),
    enabled: Boolean(objectName)
  })
}

export function useSaveDocumentType(objectName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    // a type is created once and edited after: the name is the key, so only a new one POSTs
    mutationFn: ({ existing, type }: { existing: boolean; type: DocumentTypePayload }) =>
      existing
        ? api<DocumentType>(`/objects/${objectName}/document-types/${type.name}`, {
            method: 'PUT',
            body: JSON.stringify({ label: type.label, prefix: type.prefix, template: type.template })
          })
        : api<DocumentType>(`/objects/${objectName}/document-types`, { method: 'POST', body: JSON.stringify(type) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['document-types', objectName] })
    }
  })
}

export function useDeleteDocumentType(objectName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api<void>(`/objects/${objectName}/document-types/${name}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['document-types', objectName] })
    }
  })
}

// newest first, valid and archived both: history, not just the current one
export function useRecordDocuments(objectName: string | undefined, recordId: string | undefined) {
  return useQuery({
    queryKey: ['documents', objectName, recordId],
    queryFn: () => api<IssuedDocument[]>(`/objects/${objectName}/records/${recordId}/documents`),
    enabled: Boolean(objectName && recordId)
  })
}

// issuing again archives the previous one: the list this invalidates is the only place that shows.
// also invalidates core's history query (key ['history', objectName, recordId, limit] -- this
// prefix matches every limit) so the new ISSUE row shows up without a manual refresh.
export function useIssueDocument(objectName: string, recordId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (typeName: string) => api<IssuedDocument>(`/objects/${objectName}/records/${recordId}/documents/${typeName}`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', objectName, recordId] })
      void queryClient.invalidateQueries({ queryKey: ['history', objectName, recordId] })
    }
  })
}

// one issued document by id, for the history link and the print page. a deleted one answers 404:
// an answer, not a failure, so never retried.
export function useIssuedDocument(documentId: string | null) {
  return useQuery({
    queryKey: ['history', 'document', documentId],
    queryFn: () => api<IssuedDocument>(`/documents/${documentId}`),
    enabled: Boolean(documentId),
    retry: false
  })
}
