import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { AuditEntry, AuditEntryPayload, AuditFilters } from '../../types/audit'

// old payloads have no `changes`, and rows from before this operation existed have no `documentId`.
// fill both so nothing downstream has to check.
function normalize(entries: AuditEntryPayload[]): AuditEntry[] {
  return entries.map((entry) => ({ ...entry, changes: entry.changes ?? [], documentId: entry.documentId ?? null }))
}

function query(filters: AuditFilters): string {
  const params = new URLSearchParams()
  if (filters.objectName) params.set('objectName', filters.objectName)
  if (filters.recordId) params.set('recordId', filters.recordId)
  if (filters.operation) params.set('operation', filters.operation)
  params.set('limit', String(filters.limit ?? 100))
  return params.toString()
}

// the per-record endpoint may not exist yet. do not retry a 404, the card degrades on isError.
export function useRecordHistory(objectName: string, recordId: string, limit = 20) {
  return useQuery({
    queryKey: ['history', objectName, recordId, limit],
    queryFn: async () => normalize(await api<AuditEntryPayload[]>(`/objects/${objectName}/records/${recordId}/history?limit=${limit}`)),
    enabled: Boolean(objectName && recordId),
    retry: false
  })
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: async () => normalize(await api<AuditEntryPayload[]>(`/audit?${query(filters)}`)),
    retry: false
  })
}
