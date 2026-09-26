import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@wasichai/core'
import type { Automation, AutomationPayload, AutomationRun, DocumentTypeOption, WorkflowOutline } from './types'

export function useAutomations(objectName: string | undefined) {
  return useQuery({
    queryKey: ['automations', objectName],
    queryFn: () => api<Automation[]>(`/objects/${objectName}/automations`),
    enabled: Boolean(objectName),
    retry: false
  })
}

// POST creates, PUT edits the one named in the path. the body may rename it.
export function useSaveAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ objectName, name, payload }: { objectName: string; name?: string; payload: AutomationPayload }) =>
      api<Automation>(name ? `/objects/${objectName}/automations/${name}` : `/objects/${objectName}/automations`, {
        method: name ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['automations', saved.objectName] })
      void queryClient.invalidateQueries({ queryKey: ['automation-runs'] })
    }
  })
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ objectName, name }: { objectName: string; name: string }) => api<void>(`/objects/${objectName}/automations/${name}`, { method: 'DELETE' }),
    onSuccess: (_result, { objectName }) => {
      void queryClient.invalidateQueries({ queryKey: ['automations', objectName] })
      void queryClient.invalidateQueries({ queryKey: ['automation-runs'] })
    }
  })
}

// the log of one automation: what fired, what was skipped and why
export function useAutomationRuns(objectName: string | undefined, name: string | undefined) {
  return useQuery({
    queryKey: ['automation-runs', objectName, name],
    queryFn: () => api<AutomationRun[]>(`/objects/${objectName}/automations/${name}/runs`),
    enabled: Boolean(objectName && name),
    retry: false
  })
}

export function useRecentRuns(limit = 100) {
  return useQuery({
    queryKey: ['automation-runs', 'recent', limit],
    queryFn: () => api<AutomationRun[]>(`/automation-runs?limit=${limit}`),
    retry: false
  })
}

// same key, path and retry as @wasichai/workflow's useWorkflow: one cache entry, no package import.
// an object without a workflow (or an app without the workflow module) answers 404: pickers stay empty.
export function workflowOutlineQuery(objectName: string | undefined) {
  return queryOptions({
    queryKey: ['workflow', objectName],
    queryFn: () => api<WorkflowOutline>(`/objects/${objectName}/workflow`),
    enabled: Boolean(objectName),
    retry: false
  })
}

export function useWorkflowOutline(objectName: string | undefined) {
  return useQuery(workflowOutlineQuery(objectName))
}

// same key and path as @wasichai/documents' useDocumentTypes. retry off: without the documents module
// the server answers 404, and that only means there is nothing to pick.
export function documentTypeOptionsQuery(objectName: string | undefined) {
  return queryOptions({
    queryKey: ['document-types', objectName],
    queryFn: () => api<DocumentTypeOption[]>(`/objects/${objectName}/document-types`),
    enabled: Boolean(objectName),
    retry: false
  })
}

export function useDocumentTypeOptions(objectName: string | undefined) {
  return useQuery(documentTypeOptionsQuery(objectName))
}
