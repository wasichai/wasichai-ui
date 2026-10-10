import { useEffect } from 'react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageRenderer } from './PageRenderer'
import type { ReactElement } from 'react'
import { renderWithProviders as renderBase } from '@wasichai/testing'
import { noteModule, sketchModule } from '../../test/fakeModules'
import type { FieldMeta, ObjectDefinition, Page, PageComponent, PageLayout, PageTemplate, RecordItem } from '../../types/metadata'

// every page here may hold module fields and components
const renderWithProviders = (ui: ReactElement) => renderBase(ui, { modules: [sketchModule, noteModule] })

// the factory runs during the import phase, so the fixture has to be hoisted with it
const { sides, mounts } = vi.hoisted(() => ({
  mounts: { history: 0 },
  sides: [
    {
      relationship: 'predio_titular',
      label: 'Titular',
      type: 'MANY_TO_ONE',
      objectName: 'titular',
      objectLabel: 'Titular',
      many: false
    }
  ]
}))

vi.mock('../related/RelatedList', () => ({
  RelatedList: ({ side }: { side: { relationship: string } }) => <div data-testid="related-list">{side.relationship}</div>
}))

// the history panel fetches on mount; counting its mounts is how we check a tab stayed shut
vi.mock('../../features/history/RecordHistory', () => ({
  RecordHistory: () => {
    // on mount, not on render: a hidden tab re-renders, and that is not a fetch
    useEffect(() => {
      mounts.history += 1
    }, [])
    return <div data-testid="history-timeline" />
  }
}))

vi.mock('../../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../queries')>()
  return {
    ...actual,
    useObjectRelationships: () => ({ data: sides })
  } as unknown as typeof actual
})

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

function sketchField(name: string, label: string): FieldMeta {
  return { ...field(name, label), type: 'SKETCH' }
}

const definition: ObjectDefinition = {
  id: 'o1',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  geometry: { type: 'POLYGON', srid: 4326, dimension: 2 },
  fields: [field('codigo', 'Código'), field('area', 'Área'), field('nombre', 'Nombre'), sketchField('lote', 'Lote')]
}

const record: RecordItem = {
  id: 'r1',
  createdAt: null,
  updatedAt: null,
  attributes: { codigo: 'P-001', area: '850', nombre: 'La Esperanza' },
  geometries: {}
}

function node(type: PageComponent['type'], extra: Partial<PageComponent> = {}): PageComponent {
  return {
    type,
    column: 1,
    title: null,
    layout: 'single-column',
    children: [],
    relationship: null,
    fields: null,
    content: null,
    region: null,
    ...extra
  }
}

function pageOf(root: PageComponent, template: PageTemplate): Page {
  return {
    id: 'p1',
    name: 'predio_record_detail',
    label: 'Detalle de predio',
    objectName: 'predio',
    kind: 'RECORD_DETAIL',
    template,
    generated: true,
    definition: { page: root }
  }
}

// most tests here care about generic layout/tab/form behaviour, not templates: a single
// full-width region carries whatever the old flat root component list used to hold.
function rootPage(children: PageComponent[], layout: PageLayout = 'single-column'): Page {
  const root = node('PAGE', { children: [node('REGION', { region: 'MAIN', layout, children })] })
  return pageOf(root, { name: 'single-region', columns: 12, rows: [{ regions: [{ name: 'MAIN', span: 12 }] }] })
}

describe('PageRenderer tabs', () => {
  beforeEach(() => {
    mounts.history = 0
  })

  it('draws no tab strip for a page nobody tabbed', () => {
    const page = rootPage([node('FORM'), node('HISTORY')])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByTestId('history-timeline')).toBeInTheDocument()
  })

  it('draws a section inside a tab, down the tree', () => {
    const page = rootPage([
      node('TABS', { children: [node('TAB', { title: 'Detalles', children: [node('SECTION', { title: 'Datos', children: [node('FORM')] })] })] })
    ])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Detalles' })).toBeInTheDocument()
    expect(screen.getByText('Datos')).toBeInTheDocument()
  })

  // the same property the flat model earned: an unopened tab must not mount
  it('does not mount a tab nobody opened, and keeps it mounted once opened', async () => {
    mounts.history = 0
    const page = rootPage([
      node('TABS', {
        children: [node('TAB', { title: 'Detalles', children: [node('FORM')] }), node('TAB', { title: 'Historial', children: [node('HISTORY')] })]
      })
    ])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)
    expect(mounts.history).toBe(0)

    await userEvent.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(mounts.history).toBe(1)

    await userEvent.click(screen.getByRole('tab', { name: 'Detalles' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(mounts.history).toBe(1)
  })

  it('prints a tab an admin named as they named it', () => {
    const page = rootPage([
      node('TABS', {
        children: [node('TAB', { title: 'Ficha catastral', children: [node('FORM')] }), node('TAB', { title: 'Historial', children: [node('HISTORY')] })]
      })
    ])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Ficha catastral' })).toBeInTheDocument()
  })

  it('leaves a tab off the strip when everything in it is gone', () => {
    const page = rootPage([
      node('TABS', {
        children: [
          node('TAB', { title: 'Detalles', children: [node('FORM')] }),
          node('TAB', { title: 'Fantasma', children: [node('RELATED_LIST', { relationship: 'ya_no_existe' })] })
        ]
      })
    ])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.queryByRole('tab', { name: 'Fantasma' })).not.toBeInTheDocument()
  })

  // relationships answer after the page: a tab of related lists then joins the strip in front of
  // the open one. counting only the tabs drawn so far, the open tab's id moved and its form unmounted
  it('keeps the open tab and what was typed in it when a tab before it starts drawing', async () => {
    const page = rootPage([
      node('TABS', {
        children: [
          node('TAB', { title: 'Vecinos', children: [node('RELATED_LIST', { relationship: 'predio_vecino' })] }),
          node('TAB', { title: 'Detalles', children: [node('FORM')] })
        ]
      })
    ])
    const { rerender } = renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Código'), '-B')

    sides.push({ relationship: 'predio_vecino', label: 'Vecinos', type: 'MANY_TO_MANY', objectName: 'predio', objectLabel: 'Predio', many: true })
    try {
      rerender(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)
      expect(screen.getByRole('tab', { name: 'Vecinos' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Detalles' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByLabelText('Código')).toHaveValue('P-001-B')
    } finally {
      sides.pop()
    }
  })
})

describe('PageRenderer', () => {
  // firstForm used to return only on FORM. a page whose only form is dynamic then had no owner at
  // all, so every form rendered read-only and the record could not be saved from anywhere -- with
  // the whole suite green, because nothing asked.
  it('lets a page whose only form is dynamic be saved', async () => {
    const onSubmit = vi.fn()
    const page = rootPage([node('DYNAMIC_FORM', { children: [node('FIELD', { field: 'nombre' })] })])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={onSubmit} />)

    const saves = screen.getAllByRole('button', { name: /guardar/i })
    expect(saves).toHaveLength(1)
    await userEvent.click(saves[0])
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('draws the placed fields and leaves out one marked invisible', () => {
    const page = rootPage([
      node('DYNAMIC_FORM', {
        children: [node('FIELD', { field: 'nombre' }), node('FIELD', { field: 'codigo', visible: false })]
      })
    ])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.queryByText('Código')).not.toBeInTheDocument()
  })

  // one record, one save button, wherever in the tree the first form happens to sit
  it('gives submission to the first form in document order, however deep it is', async () => {
    const onSubmit = vi.fn()
    const page = rootPage([node('SECTION', { title: 'Arriba', children: [node('FORM')] }), node('FORM', { title: 'Abajo' })])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={onSubmit} />)

    const saves = screen.getAllByRole('button', { name: /guardar/i })
    expect(saves).toHaveLength(1)
    await userEvent.click(saves[0])
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  // the server refuses the update anyway (409 append-only, 403 api-only): no button that only fails
  it('offers no save on an append-only object', () => {
    const page = rootPage([node('FORM'), node('DYNAMIC_FORM', { children: [node('FIELD', { field: 'nombre' })] })])

    renderWithProviders(<PageRenderer page={page} definition={{ ...definition, appendOnly: true }} record={record} onSubmit={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /guardar/i })).toBeNull()
    expect(screen.getAllByLabelText('Código').every((input) => (input as HTMLInputElement).disabled)).toBe(true)
    expect(screen.getAllByLabelText('Nombre').every((input) => (input as HTMLInputElement).disabled)).toBe(true)
  })

  // the record's shape is still the record's: an object nobody may update keeps showing it
  it('still shows the module fields of an append-only record, read-only', () => {
    const page = rootPage([node('FORM')])

    renderWithProviders(<PageRenderer page={page} definition={{ ...definition, appendOnly: true }} record={record} onSubmit={vi.fn()} />)

    expect(screen.getByTestId('sketch-field').closest('[inert]')).not.toBeNull()
    expect(screen.queryByRole('button', { name: /guardar/i })).toBeNull()
  })

  // a read-along form drew a live widget whose edit nothing would save
  it('draws the module field of a read-along form inert', () => {
    const page = rootPage([node('FORM', { fields: ['codigo'] }), node('DYNAMIC_FORM', { children: [node('FIELD', { field: 'lote' })] })])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.getByTestId('sketch-field').closest('[inert]')).not.toBeNull()
    expect(screen.getAllByRole('button', { name: /guardar/i })).toHaveLength(1)
  })

  it('offers no save on an api-only object', () => {
    const page = rootPage([node('FORM')])

    renderWithProviders(<PageRenderer page={page} definition={{ ...definition, apiOnly: true }} record={record} onSubmit={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /guardar/i })).toBeNull()
    expect(screen.getByLabelText('Código')).toBeDisabled()
  })

  it('hands the server violations to the form that saves', () => {
    const page = rootPage([node('FORM', { fields: ['codigo'] })])

    renderWithProviders(
      <PageRenderer
        page={page}
        definition={definition}
        record={record}
        onSubmit={vi.fn()}
        error="Conflict"
        violations={[{ field: 'codigo', message: 'must be unique' }]}
      />
    )

    expect(screen.getByText('must be unique')).toBeInTheDocument()
    expect(screen.getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true')
  })

  it('lays a two-column section out in two columns inside a one-column page', () => {
    const page = rootPage([
      node('SECTION', { title: 'Datos', layout: 'two-column', children: [node('FORM'), node('TEXT', { column: 2, content: 'al lado' })] })
    ])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(within(screen.getByTestId('page-column-2')).getByText('al lado')).toBeInTheDocument()
  })

  it('puts each root component in the column it asks for', () => {
    const page = rootPage([node('FORM'), node('TEXT', { column: 2, content: 'al lado' })], 'two-column')

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(within(screen.getByTestId('page-column-2')).getByText('al lado')).toBeInTheDocument()
  })

  // the server refuses this, but a page stored before the layout shrank still has to draw
  it('keeps a root component that asks for a column the page does not have', () => {
    const page = rootPage([node('TEXT', { column: 2, content: 'huerfano' })], 'single-column')

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(within(screen.getByTestId('page-column-1')).getByText('huerfano')).toBeInTheDocument()
  })

  it('renders only the fields a form names, in that order', () => {
    const page = rootPage([node('FORM', { fields: ['nombre', 'codigo'] })])
    const { container } = renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    // a module field the form does not name is not drawn either: it is a field like the rest
    const labels = [...container.querySelectorAll('label')].map((label) => label.textContent)
    expect(labels).toEqual(['Nombre', 'Código'])
  })

  it('draws the module field a form names, where the author put it', () => {
    const page = rootPage([node('FORM', { fields: ['lote', 'codigo'] })])
    const { container } = renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    const labels = [...container.querySelectorAll('label')].map((label) => label.textContent)
    expect(labels).toEqual([expect.stringContaining('Lote'), 'Código'])
  })

  it('renders a text component as plain text', () => {
    const page = rootPage([node('TEXT', { title: 'Nota', content: 'Revisar el <b>plano</b> antes de firmar' })])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.getByText('Revisar el <b>plano</b> antes de firmar')).toBeInTheDocument()
  })

  it('skips a related list whose relationship no longer exists', () => {
    const page = rootPage([node('RELATED_LIST', { relationship: 'fantasma' })])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.queryByTestId('related-list')).toBeNull()
  })

  it('renders a related list whose relationship is known', () => {
    const page = rootPage([node('RELATED_LIST', { relationship: 'predio_titular' })])

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.getByTestId('related-list')).toHaveTextContent('predio_titular')
  })

  it('lays the template rows out and draws what each region holds', () => {
    const tree = node('PAGE', {
      children: [
        node('REGION', { region: 'HEADER', children: [node('TEXT', { content: 'arriba' })] }),
        node('REGION', { region: 'MAIN', children: [node('FORM')] }),
        node('REGION', { region: 'RIGHT', children: [node('TEXT', { content: 'al lado' })] })
      ]
    })
    const page = pageOf(tree, {
      name: 'header-and-right-sidebar',
      columns: 12,
      rows: [
        { regions: [{ name: 'HEADER', span: 12 }] },
        {
          regions: [
            { name: 'MAIN', span: 8 },
            { name: 'RIGHT', span: 4 }
          ]
        }
      ]
    })

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.getByText('arriba')).toBeInTheDocument()
    expect(screen.getByText('al lado')).toBeInTheDocument()
  })

  // the tree is stored in whatever order the administrator left it; the template decides where
  // each region sits. shuffle one against the other, or a lookup by position passes forever.
  it('puts each region where the template says, not where the tree stored it', () => {
    const tree = node('PAGE', {
      children: [
        node('REGION', { region: 'RIGHT', children: [node('TEXT', { content: 'derecha' })] }),
        node('REGION', { region: 'HEADER', children: [node('TEXT', { content: 'cabecera' })] }),
        node('REGION', { region: 'MAIN', children: [node('TEXT', { content: 'centro' })] })
      ]
    })
    const page = pageOf(tree, {
      name: 'header-and-right-sidebar',
      columns: 12,
      rows: [
        { regions: [{ name: 'HEADER', span: 12 }] },
        {
          regions: [
            { name: 'MAIN', span: 8 },
            { name: 'RIGHT', span: 4 }
          ]
        }
      ]
    })

    const { container } = renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    const drawn = [...container.querySelectorAll('[data-region]')].map((e) => [e.getAttribute('data-region'), e.textContent])
    expect(drawn).toEqual([
      ['HEADER', 'cabecera'],
      ['MAIN', 'centro'],
      ['RIGHT', 'derecha']
    ])
  })

  // a span is inline, never a class: a class assertion would pass while tailwind emits no css
  it('gives each region the share its span asks for', () => {
    const tree = node('PAGE', {
      children: [node('REGION', { region: 'MAIN', children: [node('TEXT', { content: 'ancho' })] }), node('REGION', { region: 'RIGHT' })]
    })
    const page = pageOf(tree, {
      name: 'main-and-right-sidebar',
      columns: 12,
      rows: [
        {
          regions: [
            { name: 'MAIN', span: 8 },
            { name: 'RIGHT', span: 4 }
          ]
        }
      ]
    })

    const { container } = renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    const shares = [...container.querySelectorAll('[data-region]')].map((e) => (e as HTMLElement).style.flexGrow)
    expect(shares).toEqual(['8', '4'])
  })

  it('draws nothing for a region the template does not name', () => {
    const tree = node('PAGE', {
      children: [node('REGION', { region: 'MAIN' }), node('REGION', { region: 'LEFT', children: [node('TEXT', { content: 'fantasma' })] })]
    })
    const page = pageOf(tree, { name: 'one-region', columns: 12, rows: [{ regions: [{ name: 'MAIN', span: 12 }] }] })

    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)

    expect(screen.queryByText('fantasma')).not.toBeInTheDocument()
  })
})

describe('PageRenderer module components', () => {
  it('lets the module that registered a component type draw it', () => {
    const page = rootPage([node('NOTE', { title: 'aviso' })])
    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)
    expect(screen.getByTestId('note')).toHaveTextContent('nota aviso r1')
  })

  it('draws nothing for a type no module registered, and keeps a tab of only that off the strip', () => {
    const page = rootPage([
      node('TABS', {
        children: [
          node('TAB', { title: 'Plano', children: [node('GHOST')] }),
          node('TAB', { title: 'Detalles', children: [node('TEXT', { content: 'hola' })] })
        ]
      })
    ])
    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)
    expect(screen.queryByRole('tab', { name: 'Plano' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Detalles' })).toBeInTheDocument()
  })

  it('keeps module fields out of a form that does not save', () => {
    const page = rootPage([node('FORM', { fields: ['nombre'] }), node('FORM', { title: 'Lectura', fields: ['lote', 'codigo'] })])
    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)
    expect(screen.queryAllByTestId('sketch-field')).toHaveLength(0)
    expect(screen.getByText('Código')).toBeInTheDocument()
  })

  it('draws a placeholder instead of crashing on an unknown component type, and keeps its siblings', () => {
    const page = rootPage([node('GHOST'), node('TEXT', { content: 'hola' })])
    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)
    expect(screen.getByText('El tipo de este componente no está disponible. Instala el módulo que lo provee.')).toBeInTheDocument()
    expect(screen.getByText('hola')).toBeInTheDocument()
  })

  // an ACTION is always a core type, so a tab of it must not stay open on that alone: only its own
  // action kind (NAVIGATE, or one a module claimed) decides
  it("keeps a tab open only when its action leaf's own kind resolves", () => {
    const page = rootPage([
      node('TABS', {
        children: [
          node('TAB', { title: 'Reconoce', children: [node('ACTION', { action: 'STAMP', title: 'Sellar' })] }),
          node('TAB', { title: 'Desconoce', children: [node('ACTION', { action: 'GHOST_ACTION', title: 'Nada' })] })
        ]
      })
    ])
    renderWithProviders(<PageRenderer page={page} definition={definition} record={record} onSubmit={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Reconoce' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Desconoce' })).not.toBeInTheDocument()
  })
})
