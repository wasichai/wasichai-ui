import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable } from './DataTable'
import { renderWithProviders } from '@wasichai/testing'
import { annotationModule, sketchModule } from '../../test/fakeModules'
import type { FieldMeta, Paged, RecordItem } from '../../types/metadata'

const fields: FieldMeta[] = [
  {
    id: 'f1',
    name: 'codigo',
    label: 'Código',
    type: 'TEXT',
    required: true,
    unique: true,
    defaultValue: null,
    description: null,
    position: 0,
    enumOptions: null,
    relationTarget: null,
    geometry: null,
    visible: true,
    editable: true
  },
  {
    id: 'f2',
    name: 'area',
    label: 'Área',
    type: 'DECIMAL',
    required: false,
    unique: false,
    defaultValue: null,
    description: null,
    position: 1,
    enumOptions: null,
    relationTarget: null,
    geometry: null,
    visible: true,
    editable: true
  }
]

const page: Paged<RecordItem> = {
  content: [
    {
      id: 'r1',
      createdAt: null,
      updatedAt: null,
      attributes: { codigo: 'P-001', area: 850.5 },
      geometries: {}
    },
    {
      id: 'r2',
      createdAt: null,
      updatedAt: null,
      attributes: { codigo: 'P-002', area: null },
      geometries: {}
    }
  ],
  page: 0,
  size: 25,
  totalElements: 2,
  totalPages: 1
}

function tableProps(overrides: Partial<Parameters<typeof DataTable>[0]> = {}) {
  return {
    fields,
    page,
    search: '',
    onSearchChange: vi.fn(),
    sort: '',
    descending: false,
    onSortChange: vi.fn(),
    onPageChange: vi.fn(),
    onOpen: vi.fn(),
    onDelete: vi.fn(),
    ...overrides
  }
}

function setup(overrides: Partial<Parameters<typeof DataTable>[0]> = {}) {
  const props = tableProps(overrides)
  renderWithProviders(<DataTable {...props} />)
  return props
}

describe('DataTable', () => {
  it('builds its columns from field metadata', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Código' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Área' })).toBeInTheDocument()
    expect(screen.getByText('P-001')).toBeInTheDocument()
  })

  it('renders empty values as a dash', () => {
    setup()
    expect(screen.getAllByText('—')).toHaveLength(1)
  })

  it('asks to sort by the clicked column', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByRole('button', { name: 'Código' }))
    expect(props.onSortChange).toHaveBeenCalledWith('codigo')
  })

  it('opens the clicked row', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByText('P-001'))
    expect(props.onOpen).toHaveBeenCalledWith(page.content[0])
  })

  it('selects rows without opening them', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByLabelText('Seleccionar fila 1'))
    expect(props.onOpen).not.toHaveBeenCalled()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('pages only when there is more than one page', async () => {
    const user = userEvent.setup()
    const props = setup({ page: { ...page, totalElements: 30, totalPages: 2, size: 25 } })
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(props.onPageChange).toHaveBeenCalledWith(1)
  })

  // a row was the only way to a record, and only a pointer could use it
  it('opens a row from the keyboard, and not from a control inside it', async () => {
    const user = userEvent.setup()
    const props = setup()
    const row = screen.getByText('P-001').closest('tr') as HTMLTableRowElement
    expect(row).toHaveAttribute('tabindex', '0')

    row.focus()
    await user.keyboard('{Enter}')
    expect(props.onOpen).toHaveBeenCalledWith(page.content[0])

    screen.getByLabelText('Seleccionar fila 1').focus()
    await user.keyboard('{Enter}')
    expect(props.onOpen).toHaveBeenCalledTimes(1)
  })

  it('says which column sorts the list, and which way', () => {
    setup({ sort: 'codigo', descending: true })
    expect(screen.getByRole('columnheader', { name: 'Código' })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('columnheader', { name: 'Área' })).not.toHaveAttribute('aria-sort')
  })

  it('names its checkboxes and page buttons in the language of the app', () => {
    setup({ page: { ...page, totalElements: 30, totalPages: 2, size: 25 } })
    expect(screen.getByLabelText('Seleccionar todos')).toBeInTheDocument()
    expect(screen.getByLabelText('Seleccionar fila 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
  })

  it('counts one result in the singular', () => {
    setup({ page: { ...page, content: [page.content[0]], totalElements: 1 } })
    expect(screen.getByText('1 resultado')).toBeInTheDocument()
  })

  it('shows an empty state when there are no records', () => {
    setup({ page: { ...page, content: [], totalElements: 0 } })
    expect(screen.getByText(/Sin resultados|No results/)).toBeInTheDocument()
  })

  // a module field's value lives in its section, not attributes; its renderer draws it read-only
  it('renders a module field value through its display component when the renderer offers one', () => {
    const noteField: FieldMeta = { ...fields[0], id: 'f3', name: 'nota', label: 'Nota', type: 'NOTE_FIELD' }
    const withNote: Paged<RecordItem> = { ...page, content: [{ ...page.content[0], notes: { nota: 'hola' } }] }

    renderWithProviders(<DataTable {...tableProps({ fields: [...fields, noteField], page: withNote })} />, { modules: [annotationModule] })
    expect(screen.getByTestId('note-display')).toHaveTextContent('nota: hola')
  })

  it('falls back to plain text for a module field with no display component', () => {
    const sketchField: FieldMeta = { ...fields[0], id: 'f4', name: 'lote', label: 'Lote', type: 'SKETCH' }
    const withSketch: Paged<RecordItem> = { ...page, content: [{ ...page.content[0], sketches: { lote: 'trazado' } }] }

    renderWithProviders(<DataTable {...tableProps({ fields: [...fields, sketchField], page: withSketch })} />, { modules: [sketchModule] })
    expect(screen.getByText('trazado')).toBeInTheDocument()
  })

  it('falls back to a dash for a non-primitive value with no display component', () => {
    const sketchField: FieldMeta = { ...fields[0], id: 'f5', name: 'lote', label: 'Lote', type: 'SKETCH' }
    const withObjectValue: Paged<RecordItem> = { ...page, content: [{ ...page.content[0], sketches: { lote: { strokes: [] } } }] }

    renderWithProviders(<DataTable {...tableProps({ fields: [...fields, sketchField], page: withObjectValue })} />, { modules: [sketchModule] })
    expect(screen.queryByText('[object Object]')).toBeNull()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  // a module-section field's value never lives where the server can sort it: no sort affordance
  it('does not offer sorting on a module-section field column', async () => {
    const user = userEvent.setup()
    const sketchField: FieldMeta = { ...fields[0], id: 'f6', name: 'lote', label: 'Lote', type: 'SKETCH' }
    const props = tableProps({ fields: [...fields, sketchField] })
    renderWithProviders(<DataTable {...props} />, { modules: [sketchModule] })

    expect(screen.queryByRole('button', { name: 'Lote' })).toBeNull()
    expect(screen.getByText('Lote')).toBeInTheDocument()
    await user.click(screen.getByText('Lote'))
    expect(props.onSortChange).not.toHaveBeenCalled()
  })
})
