import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordHistory } from './RecordHistory'
import { renderWithProviders } from '@wasichai/testing'
import { issueModule } from '../../test/fakeModules'
import type { WasichaiModule } from '../../registry/contract'
import type { AuditEntry } from '../../types/audit'
import type { FieldMeta, ObjectDefinition } from '../../types/metadata'

// the mock factory runs at import time, so the mutable fixture has to be hoisted with it
const { state } = vi.hoisted(() => ({
  state: {
    entries: [] as AuditEntry[],
    isLoading: false,
    isError: false
  }
}))

vi.mock('./api', () => ({
  useRecordHistory: () => ({
    data: state.entries,
    isLoading: state.isLoading,
    isError: state.isError
  })
}))

function field(name: string, label: string): FieldMeta {
  return {
    id: name,
    name,
    label,
    type: 'TEXT',
    required: false,
    unique: false,
    defaultValue: null,
    description: null,
    position: 0,
    enumOptions: null,
    relationTarget: null,
    geometry: null,
    visible: true,
    editable: true
  }
}

const predio: ObjectDefinition = {
  id: 'predio-id',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  geometry: null,
  fields: [field('codigo', 'Código')]
}

const created: AuditEntry = {
  id: 'audit-1',
  userEmail: 'ana@wasichai.test',
  objectName: 'predio',
  recordId: 'record-1',
  operation: 'CREATE',
  occurredAt: '2026-09-17T09:00:00Z',
  changes: [],
  documentId: null
}

const updated: AuditEntry = {
  id: 'audit-2',
  userEmail: null,
  objectName: 'predio',
  recordId: 'record-1',
  operation: 'UPDATE',
  occurredAt: '2026-09-17T11:00:00Z',
  changes: [{ field: 'codigo', before: 'A-1', after: 'A-2' }],
  documentId: null
}

const issued: AuditEntry = {
  id: 'audit-3',
  userEmail: 'ana@wasichai.test',
  objectName: 'predio',
  recordId: 'record-1',
  operation: 'ISSUE',
  occurredAt: '2026-09-17T12:00:00Z',
  changes: [],
  documentId: 'document-1'
}

// changes a field no module owns on the object definition, so describeChanges must reach for the
// module's own label and value formatter -- only the live registry (via useAuditExtensions) knows them
const sketchUpdated: AuditEntry = {
  id: 'audit-4',
  userEmail: 'ana@wasichai.test',
  objectName: 'predio',
  recordId: 'record-1',
  operation: 'UPDATE',
  occurredAt: '2026-09-17T13:00:00Z',
  changes: [{ field: 'sketch', before: null, after: { strokes: [[0, 0, 1, 1]] } }],
  documentId: null
}

function renderHistory(modules: WasichaiModule[] = []) {
  return renderWithProviders(<RecordHistory objectName="predio" recordId="record-1" definition={predio} />, { modules })
}

beforeEach(() => {
  state.entries = [created, updated]
  state.isLoading = false
  state.isError = false
})

describe('RecordHistory', () => {
  it('renders a timeline, newest first, with who did it', () => {
    renderHistory()
    // direct children only: an update nests its own list of changes
    const items = document.querySelectorAll('[data-testid="history-timeline"] > li')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Modificación')
    expect(items[1]).toHaveTextContent('Creación')
    expect(screen.getByText('ana@wasichai.test')).toBeInTheDocument()
    // no user means the platform did it
    expect(screen.getByText('Sistema')).toBeInTheDocument()
  })

  it('keeps the absolute timestamp in the title of the relative time', () => {
    renderHistory()
    const stamps = document.querySelectorAll('time')
    expect(stamps).toHaveLength(2)
    expect(stamps[0].getAttribute('title')).toBeTruthy()
    expect(stamps[0].getAttribute('datetime')).toBe(updated.occurredAt)
  })

  it('shows before → after with the field label for an update', () => {
    renderHistory()
    expect(screen.getByText('Código')).toBeInTheDocument()
    expect(screen.getByText('A-1')).toBeInTheDocument()
    expect(screen.getByText('A-2')).toBeInTheDocument()
  })

  it('shows nothing but the badge for a create', () => {
    state.entries = [created]
    renderHistory()
    expect(screen.queryByText('Código')).not.toBeInTheDocument()
  })

  it('shows a link to the document for an issue, and an update still shows its changes next to it', () => {
    state.entries = [issued, updated]
    renderHistory([issueModule])
    expect(screen.getByText('Emisión')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ver documento/ })).toBeInTheDocument()
    // widening the shared entry contract must not cost the update its change list
    expect(screen.getByText('Código')).toBeInTheDocument()
    expect(screen.getByText('A-1')).toBeInTheDocument()
    expect(screen.getByText('A-2')).toBeInTheDocument()
  })

  it('resolves a module field label and value through the live registry', () => {
    state.entries = [sketchUpdated]
    renderHistory([issueModule])
    // 'sketch' is not a field of predio, and this asks for no hand-built extensions object:
    // useAuditExtensions must have read issueModule's contributions off useRegistry() itself
    expect(screen.getByText('Boceto')).toBeInTheDocument()
    expect(screen.getByText('boceto actualizado')).toBeInTheDocument()
  })

  it('shows only the badge, with the raw operation name, for an operation no module draws', () => {
    state.entries = [issued]
    renderHistory()
    expect(screen.getByText('ISSUE')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ver documento/ })).not.toBeInTheDocument()
  })

  it('degrades quietly when the endpoint fails', () => {
    state.entries = []
    state.isError = true
    renderHistory()
    expect(screen.getByText('Historial no disponible')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('says so when the record has no history', () => {
    state.entries = []
    renderHistory()
    expect(screen.getByText('Sin cambios registrados')).toBeInTheDocument()
  })
})
