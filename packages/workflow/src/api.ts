import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@wasichai/core'
import type { AvailableTransition, RecordWithState, Workflow, WorkflowPayload } from './types'

// an object without a workflow answers 404, which is an answer, not a failure: never retry it.
export function useWorkflow(objectName: string | undefined) {
  return useQuery({
    queryKey: ['workflow', objectName],
    queryFn: () => api<Workflow>(`/objects/${objectName}/workflow`),
    enabled: Boolean(objectName),
    retry: false
  })
}

export function useSaveWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ objectName, payload }: { objectName: string; payload: WorkflowPayload }) =>
      api<Workflow>(`/objects/${objectName}/workflow`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['workflow', saved.objectName] })
      // states and buttons changed under every open record of the object
      void queryClient.invalidateQueries({ queryKey: ['transitions'] })
    }
  })
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (objectName: string) => api<void>(`/objects/${objectName}/workflow`, { method: 'DELETE' }),
    onSuccess: (_result, objectName) => {
      // invalidating alone would refetch and get a fresh 404, but the flag and the picker read the
      // cache synchronously first -- drop the entry so nobody sees the deleted workflow, even briefly
      queryClient.removeQueries({ queryKey: ['workflow', objectName] })
      void queryClient.invalidateQueries({ queryKey: ['transitions'] })
    }
  })
}

// every transition leaving the record's state, allowed or not. 404 means no workflow.
export function useAvailableTransitions(objectName: string, recordId: string) {
  return useQuery({
    queryKey: ['transitions', objectName, recordId],
    queryFn: () => api<AvailableTransition[]>(`/objects/${objectName}/records/${recordId}/transitions`),
    enabled: Boolean(objectName && recordId),
    retry: false
  })
}

// moving a record touches its data, its buttons and its audit trail
export function useApplyTransition(objectName: string, recordId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      api<RecordWithState>(`/objects/${objectName}/records/${recordId}/transitions/${name}`, {
        method: 'POST'
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['record', objectName, recordId] })
      void queryClient.invalidateQueries({ queryKey: ['records', objectName] })
      void queryClient.invalidateQueries({ queryKey: ['transitions', objectName, recordId] })
      void queryClient.invalidateQueries({ queryKey: ['history', objectName, recordId] })
    }
  })
}
