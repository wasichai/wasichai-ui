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
  // what the writer said (X-Change-Reason). null when none was given. api layer defaults it.
  reason: string | null
  // the service account that wrote it; userEmail is then its backing address. null for a person or the platform.
  serviceAccount: string | null
}

// what the server sends: `changes` may be missing, old rows carry no `documentId`, and a server before
// the change reason sends neither `reason` nor `serviceAccount` (a person's entry never has `serviceAccount`).
export type AuditEntryPayload = Omit<AuditEntry, 'changes' | 'documentId' | 'reason' | 'serviceAccount'> & {
  changes?: AuditChange[]
  documentId?: string | null
  reason?: string | null
  serviceAccount?: string | null
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
