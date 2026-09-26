import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldCell, readFieldValue } from './field-value'
import type { FieldRenderer } from '../registry/contract'
import type { FieldMeta, RecordItem } from '../types/metadata'

function field(overrides: Partial<FieldMeta> = {}): FieldMeta {
  return {
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
    editable: true,
    ...overrides
  }
}

const record: RecordItem = { id: 'r1', createdAt: null, updatedAt: null, attributes: { nombre: 'Ana' }, sketches: { lote: 'trazado', boceto: { strokes: [] } } }

const sketchRenderer: FieldRenderer = { section: 'sketches', input: () => null }
const displayRenderer: FieldRenderer = {
  section: 'sketches',
  input: () => null,
  display: ({ value }) => <span data-testid="display">{`v:${String(value)}`}</span>
}

describe('readFieldValue', () => {
  it('reads an unclaimed type from attributes', () => {
    expect(readFieldValue(field(), record, {})).toBe('Ana')
  })

  it('reads a claimed type from its own section, not attributes', () => {
    expect(readFieldValue(field({ type: 'SKETCH', name: 'lote' }), record, { SKETCH: sketchRenderer })).toBe('trazado')
  })
})

describe('FieldCell', () => {
  it('formats an unclaimed field from attributes', () => {
    render(<FieldCell field={field()} record={record} fieldRenderers={{}} />)
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  it('falls back to a dash for a non-primitive value with no display component', () => {
    render(<FieldCell field={field({ type: 'SKETCH', name: 'boceto' })} record={record} fieldRenderers={{ SKETCH: sketchRenderer }} />)
    expect(screen.queryByText('[object Object]')).toBeNull()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('falls back to a dash for an empty value', () => {
    render(<FieldCell field={field({ type: 'SKETCH', name: 'ausente' })} record={record} fieldRenderers={{ SKETCH: sketchRenderer }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders through the renderer display component when it offers one', () => {
    render(<FieldCell field={field({ type: 'SKETCH', name: 'lote' })} record={record} fieldRenderers={{ SKETCH: displayRenderer }} />)
    expect(screen.getByTestId('display')).toHaveTextContent('v:trazado')
  })
})
