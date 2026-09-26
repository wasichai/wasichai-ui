// the editor's own document model, stored as it comes. a tree of typed nodes with text at the
// leaves -- prosemirror's shape, because that is what the editor writes. deliberately not html:
// nothing in this app renders html it was handed, and a template is not the place to start.
export interface TemplateNode {
  type: string
  attrs?: Record<string, unknown> | null
  content?: TemplateNode[] | null
  marks?: { type: string; attrs?: Record<string, unknown> | null }[] | null
  text?: string | null
}

export interface DocumentType {
  id: string
  name: string
  label: string
  // the sigla: SGTM in SGTM-2026-001
  prefix: string
  objectName: string
  template: TemplateNode
}

export interface DocumentTypePayload {
  name: string
  label: string
  prefix: string
  template: TemplateNode
}

export interface RelatedTableSnapshot {
  label: string
  columns: { name: string; label: string }[]
  rows: Record<string, unknown>[]
}

// what a record freezes at the moment it issues a document. the template is a copy, not a
// reference: editing the type afterwards never touches a document already handed out.
export interface DocumentSnapshot {
  template: TemplateNode
  values: Record<string, unknown>
  platform: Record<string, string>
  related: Record<string, RelatedTableSnapshot>
  objectName: string
  objectLabel: string
  number: string
  issuedAt: string
}

// not Document -- that name is the DOM's global and shadowing it bites.
export interface IssuedDocument {
  id: string
  number: string
  year: number
  sequence: number
  status: 'VALID' | 'ARCHIVED'
  recordId: string
  objectName: string
  issuedAt: string
  snapshot: DocumentSnapshot
}
