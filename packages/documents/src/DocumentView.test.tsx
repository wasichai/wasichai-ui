import { screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { coreModule } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { documentsModule } from './module'
import { DocumentView } from './DocumentView'
import type { DocumentSnapshot } from './types'

// DocumentView prints booleans through the app's i18n instance, so it needs the providers.
// coreModule is here only because documentsModule's nav sits in core's 'builder' group, which
// createRegistry requires some module to have declared -- the render itself never touches nav.
const render = (ui: ReactElement) => renderWithProviders(ui, { modules: [coreModule, documentsModule()] })

function snapshot(overrides: Partial<DocumentSnapshot> = {}): DocumentSnapshot {
  return {
    template: { type: 'doc', content: [] },
    values: {},
    platform: {},
    related: {},
    objectName: 'predio',
    objectLabel: 'Predio',
    number: 'SGTM-2026-001',
    issuedAt: '2026-09-20T00:00:00Z',
    ...overrides
  }
}

describe('DocumentView', () => {
  it('renders a field value and a frozen platform value', () => {
    const snap = snapshot({
      template: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Predio ' },
              { type: 'objectField', attrs: { field: 'codigo' } },
              { type: 'text', text: ', emitido ' },
              { type: 'platformValue', attrs: { value: 'today' } }
            ]
          }
        ]
      },
      values: { codigo: 'P-001' },
      platform: { today: '2026-09-20' }
    })

    render(<DocumentView snapshot={snap} />)

    expect(screen.getByText('P-001')).toBeInTheDocument()
    expect(screen.getByText('2026-09-20')).toBeInTheDocument()
  })

  // the whole reason a template is stored as a node tree and not html: markup-looking text is
  // just text, because there is no parser anywhere in this component to misread it
  it('keeps text that looks like html as text', () => {
    const snap = snapshot({
      template: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Revisar el <b>plano</b> antes de firmar' }] }] }
    })

    render(<DocumentView snapshot={snap} />)

    expect(screen.getByText('Revisar el <b>plano</b> antes de firmar')).toBeInTheDocument()
  })

  it('renders a relatedTable as a real table with the stored column labels and one row per stored row', () => {
    const snap = snapshot({
      template: { type: 'doc', content: [{ type: 'relatedTable', attrs: { relationship: 'predio_titular' } }] },
      related: {
        predio_titular: {
          label: 'Titulares',
          columns: [
            { name: 'nombre', label: 'Nombre' },
            { name: 'dni', label: 'DNI' }
          ],
          rows: [
            { nombre: 'Ana', dni: '123' },
            { nombre: 'Beto', dni: '456' }
          ]
        }
      }
    })

    render(<DocumentView snapshot={snap} />)

    const table = screen.getByRole('table')
    expect(within(table).getByText('Nombre')).toBeInTheDocument()
    expect(within(table).getByText('DNI')).toBeInTheDocument()
    // header row + two data rows
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('Ana')).toBeInTheDocument()
    expect(within(table).getByText('Beto')).toBeInTheDocument()
  })

  // the snapshot is frozen; the field it names may since have been deleted or renamed
  it('renders empty and does not crash for a field the snapshot has no value for', () => {
    const snap = snapshot({
      template: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Campo: ' },
              { type: 'objectField', attrs: { field: 'ghost' } }
            ]
          }
        ]
      },
      values: {}
    })

    const { container } = render(<DocumentView snapshot={snap} />)

    expect(screen.getByText('Campo:')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/undefined/)
  })

  // a geometry, or any other non-primitive, must never print as [object Object]
  it('renders empty for a field value that is an object, not a crash and not [object Object]', () => {
    const snap = snapshot({
      template: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'objectField', attrs: { field: 'lote' } }] }] },
      values: { lote: { type: 'Point', coordinates: [1, 2] } }
    })

    const { container } = render(<DocumentView snapshot={snap} />)

    expect(container.textContent).not.toMatch(/object Object/)
  })

  it('renders bold text inside a strong element', () => {
    const snap = snapshot({
      template: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Importante', marks: [{ type: 'bold' }] }] }] }
    })

    render(<DocumentView snapshot={snap} />)

    const bold = screen.getByText('Importante')
    expect(bold.tagName).toBe('STRONG')
  })

  // a boolean is a real field value and a document is prose: "true" is not a word anyone writes
  it('prints a boolean field as a word, not as true', () => {
    const snap = snapshot({
      template: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'objectField', attrs: { field: 'habilitado' } }] }] },
      values: { habilitado: true }
    })
    render(<DocumentView snapshot={snap} />)
    expect(screen.getByText('Sí')).toBeInTheDocument()
    expect(screen.queryByText('true')).not.toBeInTheDocument()
  })
})
