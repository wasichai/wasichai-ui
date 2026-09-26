import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { coreModule } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { documentsModule } from './module'
import { PrintableDocumentPage } from './PrintableDocumentPage'
import type { IssuedDocument } from './types'

// the mock factory runs at import time, so the mutable fixture has to be hoisted with it
const { state } = vi.hoisted(() => ({
  state: {
    document: undefined as IssuedDocument | undefined,
    isLoading: false
  }
}))

vi.mock('./api', () => ({
  useIssuedDocument: () => ({ data: state.document, isLoading: state.isLoading })
}))

function issuedDocument(overrides: Partial<IssuedDocument> = {}): IssuedDocument {
  return {
    id: 'document-1',
    number: 'SGTM-2026-001',
    year: 2026,
    sequence: 1,
    status: 'VALID',
    recordId: 'record-1',
    objectName: 'predio',
    issuedAt: '2026-09-20T00:00:00Z',
    snapshot: {
      template: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Predio ' },
              { type: 'objectField', attrs: { field: 'codigo' } }
            ]
          }
        ]
      },
      values: { codigo: 'P-001' },
      platform: {},
      related: {},
      objectName: 'predio',
      objectLabel: 'Predio',
      number: 'SGTM-2026-001',
      issuedAt: '2026-09-20T00:00:00Z'
    },
    ...overrides
  }
}

// the route as documentsModule mounts it by default, so useParams hands the page its id
function renderPage() {
  return renderWithProviders(<PrintableDocumentPage />, {
    modules: [coreModule, documentsModule()],
    route: '/documents/document-1/print',
    path: 'documents/:id/print'
  })
}

beforeEach(() => {
  state.document = issuedDocument()
  state.isLoading = false
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PrintableDocumentPage', () => {
  it('renders the document body and its number', () => {
    renderPage()
    expect(screen.getByText('P-001')).toBeInTheDocument()
    expect(screen.getAllByText('SGTM-2026-001').length).toBeGreaterThan(0)
  })

  it('calls window.print when the print button is clicked', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Imprimir/ }))
    expect(print).toHaveBeenCalledOnce()
  })

  it('shows the archived mark for an archived document', () => {
    state.document = issuedDocument({ status: 'ARCHIVED' })
    renderPage()
    expect(screen.getByText('ARCHIVADO')).toBeInTheDocument()
  })

  it('shows no archived mark for a valid document', () => {
    renderPage()
    expect(screen.queryByText('ARCHIVADO')).not.toBeInTheDocument()
  })

  it('carries the print-hidden class on the toolbar', () => {
    renderPage()
    expect(screen.getByTestId('print-toolbar').className).toMatch(/print:hidden/)
  })

  it('shows the unavailable message when the fetch fails', () => {
    state.document = undefined
    state.isLoading = false
    renderPage()
    expect(screen.getByText('Documento no disponible')).toBeInTheDocument()
  })

  // print.css targets `.document-sheet .overflow-x-auto` to stop a wide related table from being
  // clipped on paper (DocumentView's shared Table wraps <table> in that scrolling div). jsdom does
  // not run layout, so the clipping itself cannot be asserted here -- this only guards the
  // selector's assumption: the table (and its scroll wrapper) stay nested inside the sheet.
  it('nests a related table inside the document sheet, where the print css can reach it', () => {
    state.document = issuedDocument({
      snapshot: {
        ...issuedDocument().snapshot,
        template: { type: 'doc', content: [{ type: 'relatedTable', attrs: { relationship: 'predio_titular' } }] },
        related: {
          predio_titular: {
            label: 'Titulares',
            columns: [{ name: 'nombre', label: 'Nombre' }],
            rows: [{ nombre: 'Ana' }]
          }
        }
      }
    })
    renderPage()

    const sheet = document.querySelector('.document-sheet')
    const table = screen.getByRole('table')
    expect(sheet).toContainElement(table)
    expect(table.closest('.overflow-x-auto')).not.toBeNull()
  })
})
