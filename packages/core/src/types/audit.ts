// core only knows its own three; 'ISSUE' and any other module-added operation travels as a plain string
export type AuditOperation = 'CREATE' | 'UPDATE' | 'DELETE' | (string & {})

export interface AuditChange {
  field: string
  before: unknown
  after: unknown
}

export interface AuditEntry {
  id: string
  userEmail: string | null
  objectName: string
  recordId: string | null
  operation: AuditOperation
  occurredAt: string
  // server may not send it yet. api layer defaults it to [].
  changes: AuditChange[]
  // the document this entry is about. set only on ISSUE, by the documents module; absent everywhere else.
  documentId?: string | null
  // what the writer said (X-Change-Reason). null or absent when none was given; a server before the
  // change reason omits it. optional so a consumer's fixture without it still type-checks.
  reason?: string | null
  // the service account that wrote it; userEmail is then its backing address. null or absent for a person or the platform.
  serviceAccount?: string | null
}

// what the server sends: `changes` may be missing, old rows carry no `documentId`, and a server before
// the change reason sends neither `reason` nor `serviceAccount` (a person's entry never has `serviceAccount`).
export type AuditEntryPayload = Omit<AuditEntry, 'changes'> & {
  changes?: AuditChange[]
}

// one change, ready to paint: label resolved, values already strings.
export interface ChangeDescription {
  field: string
  label: string
  before: string
  after: string
}

export interface AuditFilters {
  objectName?: string
  recordId?: string
  operation?: AuditOperation
  limit?: number
}
