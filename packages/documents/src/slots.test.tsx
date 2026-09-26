import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecordHistory, coreModule, createRegistry, type AuditEntry, type ObjectDefinition, type RecordItem } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { documentsModule } from './module'

const { recordDocuments } = vi.hoisted(() => ({ recordDocuments: vi.fn(() => ({ data: [], isLoading: false })) }))

// the panel's own data; history comes over (mocked) http through core's hook, untouched
vi.mock('./api', () => ({
  useDocumentTypes: () => ({ data: [] }),
  useRecordDocuments: recordDocuments,
  useIssueDocument: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useIssuedDocument: () => ({ data: undefined, isLoading: false })
}))

const predio: ObjectDefinition = { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }

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

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

function renderHistory(entries: AuditEntry[]) {
  fetch = mockFetch([{ path: '/objects/predio/records/record-1/history', body: entries }])
  return renderWithProviders(<RecordHistory objectName="predio" recordId="record-1" definition={predio} />, { modules: [coreModule, documentsModule()] })
}

describe('documents in the record history', () => {
  it('shows a link to the document for an issue, under an issue badge', async () => {
    renderHistory([issued])

    expect(await screen.findByRole('button', { name: /Ver documento/ })).toBeInTheDocument()
    // the original app drew ISSUE as bg-brand/15; the 'info' tone is that same look
    expect(screen.getByText('Emisión')).toHaveClass('bg-brand/15')
  })

  it('draws no link for an old issue row that names no document', async () => {
    renderHistory([{ ...issued, documentId: null }])

    expect(await screen.findByText('Emisión')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ver documento/ })).not.toBeInTheDocument()
  })
})

describe('documents on the record page', () => {
  it('lists the record’s issued documents under it', () => {
    const record: RecordItem = { id: 'record-1', createdAt: null, updatedAt: null, attributes: {} }
    const [Panel] = createRegistry([coreModule, documentsModule()]).recordPanels

    renderWithProviders(<Panel objectName="predio" definition={predio} record={record} />, { modules: [coreModule, documentsModule()] })

    expect(screen.getByText('Documentos emitidos')).toBeInTheDocument()
    expect(screen.getByText('Este registro no tiene documentos emitidos todavía.')).toBeInTheDocument()
    expect(recordDocuments).toHaveBeenCalledWith('predio', 'record-1')
  })
})
