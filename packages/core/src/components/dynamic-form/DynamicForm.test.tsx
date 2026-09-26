import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DynamicForm } from './DynamicForm'
import { renderWithProviders } from '@wasichai/testing'
import { sketchModule } from '../../test/fakeModules'
import type { FieldMeta, Form, ObjectDefinition } from '../../types/metadata'

function field(overrides: Partial<FieldMeta>): FieldMeta {
  return {
    id: overrides.name ?? 'f',
    name: 'codigo',
    label: 'Código',
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
    editable: true,
    ...overrides
  }
}

const definition: ObjectDefinition = {
  id: 'o1',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  geometry: null,
  fields: [
    field({ id: 'f1', name: 'codigo', label: 'Código', required: true }),
    field({ id: 'f2', name: 'area', label: 'Área', type: 'DECIMAL' }),
    field({
      id: 'f3',
      name: 'uso',
      label: 'Uso',
      type: 'ENUM',
      enumOptions: ['RESIDENCIAL', 'COMERCIAL']
    })
  ]
}

const sections = [
  { title: 'Identificación', fields: ['uso', 'codigo'] },
  { title: 'Medidas', fields: ['area'] }
]

function form(sections: Form['definition']['sections']): Form {
  return {
    id: 'form1',
    name: 'predio_alta',
    label: 'Alta de predio',
    objectName: 'predio',
    generated: false,
    definition: { sections }
  }
}

describe('DynamicForm', () => {
  const onSubmit = vi.fn()

  beforeEach(() => {
    onSubmit.mockReset()
  })

  it('renders one input per field, driven by metadata', () => {
    renderWithProviders(<DynamicForm definition={definition} onSubmit={onSubmit} />)

    expect(screen.getByLabelText(/Código/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Área/)).toBeInTheDocument()
    expect(screen.getByText('Uso')).toBeInTheDocument()
  })

  it('blocks submit and reports the field when a required value is missing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DynamicForm definition={definition} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => expect(screen.getByText(/Código: required/)).toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits attributes with decimals coerced to numbers', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DynamicForm definition={definition} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/Código/), 'P-001')
    await user.type(screen.getByLabelText(/Área/), '850.5')
    await user.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      attributes: { codigo: 'P-001', area: 850.5, uso: null }
    })
  })

  // R3 leftover-type rule: a type that is neither core nor claimed by any installed module (gis's
  // GEOMETRY with no gis module registered) never travels as an attribute, and shows disabled
  // instead of a live input nobody here can validate or store
  it('excludes an unregistered field type from attributes and shows a disabled placeholder', async () => {
    const user = userEvent.setup()
    const geometry = field({ id: 'f9', name: 'lote', label: 'Lote', type: 'GEOMETRY' })
    renderWithProviders(<DynamicForm definition={{ ...definition, fields: [...definition.fields, geometry] }} onSubmit={onSubmit} />)

    expect(screen.getByLabelText('Lote')).toBeDisabled()

    await user.type(screen.getByLabelText(/Código/), 'P-3')
    await user.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ attributes: { codigo: 'P-3', area: null, uso: null } })
  })

  // a module field type is drawn by its renderer where the field sits: one widget per field
  it('draws one module widget per module field', () => {
    const { rerender } = renderWithProviders(<DynamicForm definition={definition} onSubmit={onSubmit} />, { modules: [sketchModule] })
    expect(screen.queryAllByTestId('sketch-field')).toHaveLength(0)

    const lote = field({ name: 'lote', label: 'Lote', type: 'SKETCH' })
    const acceso = field({ name: 'acceso', label: 'Acceso', type: 'SKETCH' })
    rerender(<DynamicForm definition={{ ...definition, fields: [...definition.fields, lote, acceso] }} onSubmit={onSubmit} />)
    expect(screen.queryAllByTestId('sketch-field')).toHaveLength(2)
  })

  it('hands a module field its current value and sends it back under its section', async () => {
    const user = userEvent.setup()
    const lote = field({ id: 'f9', name: 'lote', label: 'Lote', type: 'SKETCH' })
    renderWithProviders(
      <DynamicForm
        definition={{ ...definition, fields: [...definition.fields, lote] }}
        record={{ id: 'r1', createdAt: null, updatedAt: null, attributes: { codigo: 'P-1' }, sketches: { lote: 'old' } }}
        onSubmit={onSubmit}
      />,
      { modules: [sketchModule] }
    )
    expect(screen.getByTestId('sketch-field')).toHaveTextContent('old')

    await user.click(screen.getByRole('button', { name: 'dibujar lote' }))
    await user.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ attributes: { codigo: 'P-1', area: null, uso: null }, sketches: { lote: 'drawn' } })
  })

  // the original app always sent `geometries`, drawn or not. every registered section keeps that contract
  it('sends every registered section, even when the object has none of its fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DynamicForm definition={definition} onSubmit={onSubmit} />, { modules: [sketchModule] })

    await user.type(screen.getByLabelText(/Código/), 'P-2')
    await user.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ attributes: { codigo: 'P-2', area: null, uso: null }, sketches: {} })
  })

  it('lays the fields out in sections when given a form', () => {
    renderWithProviders(<DynamicForm definition={definition} form={form(sections)} onSubmit={onSubmit} />)

    expect(screen.getByRole('heading', { name: 'Identificación' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Medidas' })).toBeInTheDocument()
  })

  it('renders only the fields the form names, in the section order', () => {
    const { container } = renderWithProviders(<DynamicForm definition={definition} form={form(sections)} onSubmit={onSubmit} />)

    const labels = [...container.querySelectorAll('label')].map((label) => label.textContent)
    expect(labels).toEqual(['Uso', 'Código*', 'Área'])
  })

  it('skips a section field naming a field that no longer exists', () => {
    renderWithProviders(<DynamicForm definition={definition} form={form([{ title: 'Solo', fields: ['fantasma', 'codigo'] }])} onSubmit={onSubmit} />)

    expect(screen.getByLabelText(/Código/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Área/)).toBeNull()
  })

  it('submits only what the form shows', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DynamicForm definition={definition} form={form([{ title: null, fields: ['codigo'] }])} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/Código/), 'P-001')
    await user.click(screen.getByRole('button', { name: /Guardar|Save/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].attributes).toEqual({ codigo: 'P-001' })
  })

  it('renders a section without a title as a plain block', () => {
    const { container } = renderWithProviders(<DynamicForm definition={definition} form={form([{ title: null, fields: ['codigo'] }])} onSubmit={onSubmit} />)

    expect(container.querySelector('h3')).toBeNull()
    expect(screen.getByLabelText(/Código/)).toBeInTheDocument()
  })

  it('prefills values when editing an existing record', () => {
    renderWithProviders(
      <DynamicForm
        definition={definition}
        record={{
          id: 'r1',
          createdAt: null,
          updatedAt: null,
          attributes: { codigo: 'P-009', area: 12.5 },
          geometries: {}
        }}
        onSubmit={onSubmit}
      />
    )

    expect(screen.getByLabelText(/Código/)).toHaveValue('P-009')
  })
})
