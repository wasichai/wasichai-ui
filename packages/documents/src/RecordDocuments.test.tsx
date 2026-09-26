import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { coreModule } from '@wasichai/core'
import { RecordDocuments } from './RecordDocuments'
import { documentsModule } from './module'
import { renderWithProviders } from '@wasichai/testing'
import type { DocumentType, IssuedDocument } from './types'

const document: IssuedDocument = {
  id: 'document-1',
  number: 'SGTM-2026-001',
  year: 2026,
  sequence: 1,
  status: 'VALID',
  recordId: 'record-1',
  objectName: 'predio',
  issuedAt: '2026-09-20T00:00:00Z',
  snapshot: {
    template: { type: 'doc', content: [] },
    values: {},
    platform: {},
    related: {},
    objectName: 'predio',
    objectLabel: 'Predio',
    number: 'SGTM-2026-001',
    issuedAt: '2026-09-20T00:00:00Z'
  }
}

const types: DocumentType[] = [
  { id: 'type-1', name: 'certificado', label: 'Certificado', prefix: 'SGTM', objectName: 'predio', template: { type: 'doc', content: [] } }
]

vi.mock('./api', () => ({
  useDocumentTypes: () => ({ data: types }),
  useRecordDocuments: () => ({ data: [document], isLoading: false }),
  useIssueDocument: () => ({ mutateAsync: vi.fn(), isPending: false })
}))

describe('RecordDocuments', () => {
  it('opens the dialog with a link to the print page in a new tab', async () => {
    renderWithProviders(<RecordDocuments objectName="predio" recordId="record-1" />, { modules: [coreModule, documentsModule()] })

    await userEvent.click(screen.getByText('SGTM-2026-001'))

    const link = screen.getByRole('link', { name: /Imprimir/ })
    expect(link).toHaveAttribute('href', '/documents/document-1/print')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
