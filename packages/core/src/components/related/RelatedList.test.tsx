import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { annotationModule, sketchModule } from '../../test/fakeModules'
import type { RelatedSide } from '../../types/metadata'
import { RelatedList } from './RelatedList'

vi.mock('../../queries', () => ({
  useObjectDefinition: () => ({
    data: {
      fields: [
        {
          id: 'f1',
          name: 'nombre',
          label: 'Nombre',
          type: 'TEXT',
          required: false,
          unique: false,
          defaultValue: null,
          description: null,
          position: 0,
          enumOptions: null,
          relationTarget: null,
          visible: true,
          editable: true
        },
        {
          id: 'f2',
          name: 'lote',
          label: 'Lote',
          type: 'SKETCH',
          required: false,
          unique: false,
          defaultValue: null,
          description: null,
          position: 1,
          enumOptions: null,
          relationTarget: null,
          visible: true,
          editable: true
        },
        {
          id: 'f3',
          name: 'nota',
          label: 'Nota',
          type: 'NOTE_FIELD',
          required: false,
          unique: false,
          defaultValue: null,
          description: null,
          position: 2,
          enumOptions: null,
          relationTarget: null,
          visible: true,
          editable: true
        },
        {
          id: 'f4',
          name: 'boceto',
          label: 'Boceto',
          type: 'SKETCH',
          required: false,
          unique: false,
          defaultValue: null,
          description: null,
          position: 3,
          enumOptions: null,
          relationTarget: null,
          visible: true,
          editable: true
        }
      ]
    }
  }),
  useRelatedRecords: () => ({
    data: {
      content: [
        {
          id: 'a/b',
          createdAt: null,
          updatedAt: null,
          attributes: { nombre: 'Ana' },
          sketches: { lote: 'trazado', boceto: { strokes: [] } },
          notes: { nota: 'hola' }
        }
      ]
    }
  }),
  useRecords: () => ({ data: { content: [] } }),
  useLinkRelated: () => ({ link: { mutate: vi.fn(), isPending: false }, unlink: { mutate: vi.fn(), isPending: false } })
}))

const side: RelatedSide = { relationship: 'predio_titular', label: 'Titular', type: 'MANY_TO_ONE', objectName: 'titular', objectLabel: 'Titular', many: false }

describe('RelatedList', () => {
  it('links each related record to its own detail page', () => {
    renderWithProviders(<RelatedList objectName="predio" recordId="r1" side={side} />, { modules: [sketchModule, annotationModule] })
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/data/objects/titular/records/a%2Fb')
  })

  // a module field's value lives in its section, not attributes: the column reads from there
  it('falls back to plain text for a module field with no display component', () => {
    renderWithProviders(<RelatedList objectName="predio" recordId="r1" side={side} />, { modules: [sketchModule, annotationModule] })
    expect(screen.getByText('trazado')).toBeInTheDocument()
  })

  it('renders a module field value through its display component when the renderer offers one', () => {
    renderWithProviders(<RelatedList objectName="predio" recordId="r1" side={side} />, { modules: [sketchModule, annotationModule] })
    expect(screen.getByTestId('note-display')).toHaveTextContent('nota: hola')
  })

  it('falls back to a dash for a non-primitive value with no display component', () => {
    renderWithProviders(<RelatedList objectName="predio" recordId="r1" side={side} />, { modules: [sketchModule, annotationModule] })
    expect(screen.queryByText('[object Object]')).toBeNull()
    expect(screen.getAllByText('—')).toHaveLength(1)
  })
})
