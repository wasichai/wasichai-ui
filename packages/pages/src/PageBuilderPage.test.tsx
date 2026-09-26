import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { coreModule, type WasichaiModule, type FieldMeta, type ObjectDefinition, type Page, type PageComponent, type PageTemplate } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { pagesModule } from './module'
import { pinModule, stampModule } from './test/fakeModules'

// radix select and dialog need a layout and pointer capture jsdom lacks: native doubles, every other ui export real
vi.mock('@wasichai/ui', async (importOriginal) => ({ ...(await importOriginal<typeof import('@wasichai/ui')>()), ...(await import('./test/uiDoubles')) }))

const { state } = vi.hoisted(() => ({
  state: {
    page: null as Page | null,
    save: vi.fn(),
    remove: vi.fn(),
    templates: [] as PageTemplate[],
    fields: [] as FieldMeta[]
  }
}))

// a bare object: no fields, enough for FormMock and the inspector to render
const objectDefinition: ObjectDefinition = {
  id: 'o-1',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  fields: []
}

// only the queries the builder reads: the providers renderWithProviders mounts stay real
vi.mock('@wasichai/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/core')>()),
  useObjects: () => ({ data: [{ id: 'o-1', name: 'predio', label: 'Predio' }] }),
  useObjectDefinition: () => ({ data: { ...objectDefinition, fields: state.fields }, isLoading: false }),
  useObjectRelationships: () => ({ data: [] }),
  useForms: () => ({ data: [] }),
  useTemplates: () => ({ data: state.templates }),
  useResolvedPage: () => ({ data: state.page, isLoading: false }),
  useSavePage: () => ({ mutateAsync: state.save, isPending: false }),
  useDeletePage: () => ({ mutateAsync: state.remove, isPending: false })
}))

const { PageBuilderPage, removeNode } = await import('./PageBuilderPage')

function leaf(type: PageComponent['type'], extra: Partial<PageComponent> = {}): PageComponent {
  return {
    type,
    column: 1,
    title: null,
    layout: 'single-column',
    children: [],
    relationship: null,
    fields: null,
    content: null,
    ...extra
  }
}

// the root is always a PAGE node now, one REGION per name the template declares (Task 8/9/10).
function pageNode(children: PageComponent[]): PageComponent {
  return leaf('PAGE', { children })
}

function regionNode(name: string, children: PageComponent[] = [], layout: PageComponent['layout'] = 'single-column'): PageComponent {
  return leaf('REGION', { region: name, children, layout })
}

const oneRegion: PageTemplate = { name: 'one-region', columns: 12, rows: [{ regions: [{ name: 'MAIN', span: 12 }] }] }

const flatPage: Page = {
  id: 'p-1',
  name: 'predio_detail',
  label: 'Detalle de predio',
  objectName: 'predio',
  kind: 'RECORD_DETAIL',
  template: oneRegion,
  generated: false,
  definition: { page: pageNode([regionNode('MAIN', [leaf('FORM'), leaf('TEXT', { content: 'hola' })])]) }
}

// an empty page: the only droppable on the canvas is the single "drop here" placeholder,
// which keeps the drag test below unambiguous about where the drop has to land
const emptyPage: Page = { ...flatPage, definition: { page: pageNode([regionNode('MAIN')]) } }

// a region that splits its own content in two. the server has always accepted this shape and the
// renderer has always drawn it; until now the canvas was the only half that could not.
const splitRegionPage: Page = {
  ...flatPage,
  definition: {
    page: pageNode([regionNode('MAIN', [leaf('TEXT', { content: 'izq', column: 1 }), leaf('TEXT', { content: 'der', column: 2 })], 'two-column')])
  }
}

// a strip of two tabs, one leaf in each. the canvas draws it the way the record page will, so only
// the open tab's contents are on screen at all.
const tabbedPage: Page = {
  ...flatPage,
  definition: {
    page: pageNode([
      regionNode('MAIN', [
        leaf('TABS', {
          children: [
            leaf('TAB', { title: 'Ficha', children: [leaf('TEXT', { content: 'uno' })] }),
            leaf('TAB', { title: 'Auditoría', children: [leaf('TEXT', { content: 'dos' })] })
          ]
        })
      ])
    ])
  }
}

// two regions in one row, one leaf in each: what used to be "a two-column page" is now just
// a template with two named regions sitting side by side.
const twoRegionTemplate: PageTemplate = {
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
}

const twoRegionPage: Page = {
  ...flatPage,
  template: twoRegionTemplate,
  definition: {
    page: pageNode([regionNode('MAIN', [leaf('TEXT', { content: 'left' })]), regionNode('RIGHT', [leaf('TEXT', { content: 'right' })])])
  }
}

// the object picker carries no aria-label anywhere in this codebase's builder pages, so
// grab it by structure: before an object is chosen, it is the only select on the page.
// coreModule owns the 'builder' nav group pagesModule() targets: the registry needs both, or it
// refuses to resolve pagesModule's own nav entry
async function open(modules: WasichaiModule[] = []) {
  const rendered = renderWithProviders(<PageBuilderPage />, { modules: [coreModule, pagesModule(), ...modules] })
  const objectSelect = rendered.container.querySelector('select') as HTMLSelectElement
  await userEvent.selectOptions(objectSelect, 'predio')
  return rendered
}

// the one region's children as the save call received them
function savedRegion(): PageComponent {
  const [[{ page }]] = state.save.mock.calls as [[{ page: { definition: { page: PageComponent } } }]]
  return page.definition.page.children[0]
}

// dnd-kit leaves a capture-phase click blocker on the document for 50ms after a drag ends. real time:
// it is a real timeout, and 120ms is margin over it, not against it
const afterDrag = () => new Promise((resolve) => setTimeout(resolve, 120))

// drags a palette item onto a droppable slot by hand: pointerdown on the source, then a
// pointermove past the activation distance, then pointerup. dnd-kit's collision detection
// compares real bounding rects, which jsdom never lays out, so every element gets one assigned:
// the target sits 300px away, everything else (the source, and the drag overlay dnd-kit mounts
// at the source's original spot once the drag starts) sits at the origin. moving the pointer by
// the same 300px then carries the dragged rect exactly onto the target's.
function dragOnto(source: Element, target: Element) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return this === target ? rect(300, 300) : rect(0, 0)
  })
  fireEvent.pointerDown(source, { pointerId: 1, isPrimary: true, button: 0, clientX: 10, clientY: 10 })
  // the move that crosses the activation distance only starts the drag; dnd-kit does not treat
  // that same event as a position update, so the pointer's actual arrival needs a second move
  fireEvent.pointerMove(document, { pointerId: 1, clientX: 310, clientY: 310 })
  fireEvent.pointerMove(document, { pointerId: 1, clientX: 310, clientY: 310 })
  fireEvent.pointerUp(document, { pointerId: 1, clientX: 310, clientY: 310 })
}

function rect(left: number, top: number): DOMRect {
  return { left, top, right: left + 20, bottom: top + 20, width: 20, height: 20, x: left, y: top, toJSON: () => ({}) }
}

// an empty aria-describedby is the fingerprint of a draggable dnd-kit never wired up: the
// description it points to only exists once a shared DndContext measures and registers it.
// shared so the sweep can run again once the template picker's dialog is actually open -- that
// dialog's trigger sits above DndProvider, which is the one place this fingerprint could appear.
function expectEveryDraggableWired(container: HTMLElement) {
  const draggables = container.querySelectorAll('[aria-roledescription="draggable"]')
  expect(draggables.length).toBeGreaterThan(0)
  draggables.forEach((item) => {
    expect(item.getAttribute('aria-describedby')).toBeTruthy()
  })
}

beforeEach(() => {
  state.page = flatPage
  state.save = vi.fn()
  state.remove = vi.fn()
  state.templates = [oneRegion, twoRegionTemplate]
  state.fields = []
  vi.restoreAllMocks()
})

describe('PageBuilderPage', () => {
  it('loads a stored page into the canvas', async () => {
    await open()
    // the TEXT leaf's own content is the mock preview the canvas draws for it
    expect(await screen.findByText('hola')).toBeInTheDocument()
  })

  it('clicking a canvas node selects it and the inspector shows it', async () => {
    await open()
    // a real click, not a synthetic one: this is exactly what a plain click must survive
    await userEvent.click(await screen.findByText('hola'))
    const contentBox = screen.getByDisplayValue('hola')
    expect(contentBox.tagName).toBe('TEXTAREA')
  })

  it('splits a two-column region into two columns, each holding its own child', async () => {
    state.page = splitRegionPage
    await open()
    // the columns must actually hold the right child: asserting the containers exist would pass
    // while both children sat in column one
    expect(within(await screen.findByTestId('region-column-1')).getByText('izq')).toBeInTheDocument()
    expect(within(screen.getByTestId('region-column-2')).getByText('der')).toBeInTheDocument()
    expect(within(screen.getByTestId('region-column-1')).queryByText('der')).not.toBeInTheDocument()
  })

  it('selecting a region offers its layout and never a way to delete it', async () => {
    await open()
    await userEvent.click(await screen.findByRole('button', { name: 'Principal' }))
    const inspector = screen.getByText('Región').closest('div')!.parentElement!
    expect(within(inspector).getByText('Diseño')).toBeInTheDocument()
    // the bin is the dangerous one: deleting a region invalidates the page against the server
    expect(within(inspector).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  describe('the tab strip', () => {
    beforeEach(() => {
      state.page = tabbedPage
    })

    it('draws one tab per child and opens the first', async () => {
      await open()
      // scoped to the canvas strip on purpose: the palette has its own tablist now, and an
      // unscoped role="tab" query would count both
      const strip = await screen.findByRole('tablist', { name: 'Pestañas del lienzo' })
      const tabs = within(strip).getAllByRole('tab')
      expect(tabs.map((tab) => tab.textContent)).toEqual(['Ficha1', 'Auditoría1'])
      expect(tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true')).toHaveLength(1)
    })

    // the behaviour change, asserted head on: a closed tab is not hidden, it is not there. that is
    // why hovering its title during a drag is the only way into it.
    it('keeps the closed tab out of the dom entirely', async () => {
      await open()
      expect(await screen.findByText('uno')).toBeInTheDocument()
      expect(screen.queryByText('dos')).not.toBeInTheDocument()
    })

    // the strip changes who renders what inside the provider, so the sweep has to run over it too.
    // what this does NOT catch, checked by breaking it: a merged ref that drops the draggable half.
    // dnd-kit's attributes carry aria-describedby whether or not the ref ever landed, so a dead
    // drag ref is invisible here and belongs in the browser pass.
    it('every draggable stays wired once a strip is on the canvas', async () => {
      const { container } = await open()
      expect(container.querySelectorAll('[role="tab"][aria-roledescription="draggable"]').length).toBe(2)
      expectEveryDraggableWired(container)
    })

    it('a real click on a title both opens that tab and selects it', async () => {
      await open()
      await userEvent.click(await screen.findByRole('tab', { name: /Auditoría/ }))
      expect(await screen.findByText('dos')).toBeInTheDocument()
      expect(screen.queryByText('uno')).not.toBeInTheDocument()
      // the same click has to reach the inspector: a title that swallowed it would look fine
      expect(screen.getByDisplayValue('Auditoría')).toBeInTheDocument()
    })
  })

  describe('fields', () => {
    const meta = (name: string, label: string, editable = true): FieldMeta => ({
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
      editable
    })

    beforeEach(() => {
      state.fields = [meta('codigo', 'Código'), meta('sellado', 'Sellado', false)]
    })

    it('the fields tab lists the object own fields, ready to drag', async () => {
      await open()
      await userEvent.click(screen.getByRole('tab', { name: 'Campos' }))
      const field = await screen.findByRole('button', { name: 'Código' })
      expect(field.getAttribute('aria-roledescription')).toBe('draggable')
      expect(field.getAttribute('aria-describedby')).toBeTruthy()
    })

    it('a placed field offers visible and editable, and will not offer to unlock a read-only one', async () => {
      state.page = {
        ...flatPage,
        definition: {
          page: pageNode([regionNode('MAIN', [leaf('DYNAMIC_FORM', { children: [leaf('FIELD', { field: 'sellado' })] })])])
        }
      }
      await open()
      await userEvent.click(await screen.findByText('Sellado'))
      expect(screen.getByLabelText('Visible')).not.toBeDisabled()
      // the server refuses editable on a read-only field, so the inspector must not offer it
      expect(screen.getByLabelText('Editable')).toBeDisabled()
    })
  })

  it('an empty region shows the drop-here placeholder', async () => {
    state.page = emptyPage
    await open()
    expect(await screen.findByText('Arrastra un componente aquí')).toBeInTheDocument()
  })

  it('dragging a component from the palette onto the canvas reaches the tree that gets saved', async () => {
    state.page = emptyPage
    await open()
    const textButton = screen.getByRole('button', { name: 'Texto' })
    const dropZone = await screen.findByText('Arrastra un componente aquí')
    dragOnto(textButton, dropZone)
    // the fresh TEXT leaf's own placeholder is the canvas mock's proof a node landed
    expect(await screen.findByText('Texto de ejemplo')).toBeInTheDocument()
    // dnd-kit leaves a capture-phase click blocker on the document for 50ms after a drag ends,
    // so it can swallow the click a drop lands on top of. real time, not fake: it is a real timeout.
    // margin over the 50ms guard, not against it: 10ms is a flake waiting for a loaded CI box.
    await new Promise((resolve) => setTimeout(resolve, 120))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({
        page: expect.objectContaining({
          definition: { page: expect.objectContaining({ type: 'PAGE', children: [expect.objectContaining({ type: 'REGION', region: 'MAIN' })] }) }
        })
      })
    )
  })

  it('saving sends the tree, with no client-only ids leaking onto the wire', async () => {
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(state.save).toHaveBeenCalledWith({
      generated: false,
      page: {
        objectName: 'predio',
        name: 'predio_detail',
        label: 'Detalle de predio',
        kind: 'RECORD_DETAIL',
        template: 'one-region',
        definition: { page: pageNode([regionNode('MAIN', [leaf('FORM'), leaf('TEXT', { content: 'hola' })])]) }
      }
    })
  })

  describe('components and actions modules add', () => {
    // stored while gis and workflow were installed, opened in an app that has neither
    const orphanPage: Page = {
      ...flatPage,
      definition: {
        page: pageNode([
          regionNode('MAIN', [
            leaf('MAP', { title: 'Ubicación', geometry: 'geom' }),
            leaf('ACTION', { action: 'TRANSITION', transition: 'aprobar', style: 'PRIMARY' })
          ])
        ])
      }
    }

    it('keeps a component whose module is missing', async () => {
      state.page = orphanPage
      await open()
      // a labelled placeholder, not a blank hole: the admin can still see, move or delete it
      expect(await screen.findByText('MAP')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ page: expect.objectContaining({ definition: orphanPage.definition }) }))
    })

    it('drops an ACTION as NAVIGATE when no module adds a kind', async () => {
      state.page = emptyPage
      await open()
      dragOnto(screen.getByRole('button', { name: 'Acción' }), await screen.findByText('Arrastra un componente aquí'))
      await afterDrag()
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(savedRegion().children).toEqual([expect.objectContaining({ type: 'ACTION', action: 'NAVIGATE', style: 'SECONDARY' })])
    })

    it('drops an ACTION as the first kind a module adds, with that kind defaults', async () => {
      state.page = emptyPage
      await open([stampModule])
      dragOnto(screen.getByRole('button', { name: 'Acción' }), await screen.findByText('Arrastra un componente aquí'))
      await afterDrag()
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(savedRegion().children).toEqual([expect.objectContaining({ type: 'ACTION', action: 'STAMP', style: 'PRIMARY', seal: 'oficial' })])
    })

    it('offers a module component in the palette and drops it with its defaults and preview', async () => {
      state.page = emptyPage
      await open([pinModule])
      dragOnto(screen.getByRole('button', { name: 'Chincheta' }), await screen.findByText('Arrastra un componente aquí'))
      expect(await screen.findByTestId('pin-preview')).toHaveTextContent('chincheta rojo')
      await afterDrag()
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(savedRegion().children).toEqual([expect.objectContaining({ type: 'PIN', title: 'Chincheta nueva', color: 'rojo' })])
    })

    it('offers neither MAP nor WORKFLOW in the palette when no module adds them', async () => {
      await open()
      await screen.findByText('hola')
      expect(screen.queryByRole('button', { name: 'Mapa' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Workflow' })).not.toBeInTheDocument()
    })
  })

  it('every draggable in the document carries a live drag context, not just its aria shell', async () => {
    const { container } = await open()
    await screen.findByText('hola')
    // asserted over every draggable, not just the palette's <button>s -- this task adds a template
    // picker whose trigger sits ABOVE DndProvider, so anything inside it that ever picked up
    // useDraggable would carry exactly this fingerprint instead of a real description.
    expectEveryDraggableWired(container)
  })

  it('no region is draggable -- only the content sitting inside it is', async () => {
    const { container } = await open()
    await screen.findByText('hola')
    // a region wrapping itself in useDraggable is exactly the bug this guards: two content
    // nodes (FORM, TEXT) means the region around them picked up nothing of its own.
    const canvasDraggables = container.querySelectorAll('div[aria-roledescription="draggable"]')
    expect(canvasDraggables).toHaveLength(2)
  })

  it('lays a template with two regions out and names each one', async () => {
    state.page = twoRegionPage
    await open()
    expect(await screen.findByText('left')).toBeInTheDocument()
    expect(screen.getByText('right')).toBeInTheDocument()
    // this task adds the region translations (Task 14); the canvas region label picks them up
    expect(screen.getByText('Principal')).toBeInTheDocument()
    expect(screen.getByText('Derecha')).toBeInTheDocument()
  })

  // a region is matched to its slot by NAME (Canvas.tsx: root.children.findIndex by
  // child.region), never by array position. every other fixture in this file happens to store
  // children in the same order the template lists them, which cannot tell a name lookup apart
  // from "just take the next one" -- so this one stores them backwards on purpose.
  it('renders each region under its own name, not the position it happens to be stored at', async () => {
    state.page = {
      ...twoRegionPage,
      definition: {
        page: pageNode([regionNode('RIGHT', [leaf('TEXT', { content: 'right-content' })]), regionNode('MAIN', [leaf('TEXT', { content: 'main-content' })])])
      }
    }
    const { container } = await open()
    await screen.findByText('main-content')

    // the template's own row order is MAIN (span 8) then RIGHT (span 4). Canvas.tsx's own
    // per-slot wrapper is the only inline-flex-grow div with no data-region -- that attribute
    // belongs to the always-mounted TemplatePreview beside the "Cambiar" button, a different
    // component reading the same template, which would otherwise contaminate this query.
    const wrappers = [...container.querySelectorAll('div')].filter((element) => element.style.flexGrow !== '' && !element.hasAttribute('data-region'))
    expect(wrappers).toHaveLength(2)
    // the template says MAIN is 8 and RIGHT is 4 -- an unread span would still pass with any two values
    expect(wrappers.map((w) => w.style.flexGrow)).toEqual(['8', '4'])
    expect(within(wrappers[0]).getByText('Principal')).toBeInTheDocument()
    expect(within(wrappers[0]).getByText('main-content')).toBeInTheDocument()
    expect(within(wrappers[1]).getByText('Derecha')).toBeInTheDocument()
    expect(within(wrappers[1]).getByText('right-content')).toBeInTheDocument()
  })

  it('draws nothing for a template slot no stored region matches', async () => {
    const ghostTemplate: PageTemplate = {
      name: 'main-and-ghost',
      columns: 12,
      rows: [
        {
          regions: [
            { name: 'MAIN', span: 8 },
            { name: 'GHOST', span: 4 }
          ]
        }
      ]
    }
    // flatPage's tree has only a MAIN region -- nothing named GHOST. a mismatch is a server
    // validation bug; the canvas must not invent a region to paper over it.
    state.page = { ...flatPage, template: ghostTemplate }
    const { container } = await open()
    await screen.findByText('hola')

    const wrappers = [...container.querySelectorAll('div')].filter((element) => element.style.flexGrow !== '' && !element.hasAttribute('data-region'))
    expect(wrappers).toHaveLength(1)
    expect(screen.queryByText('GHOST')).not.toBeInTheDocument()
  })

  describe('template picker', () => {
    async function openPicker() {
      const rendered = await open()
      await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }))
      return rendered
    }

    // the sweep above never actually opens this dialog, so it never looked at the one place its
    // own comment claims to guard. re-run it here, with the dialog open, on both of its steps.
    it('the sweep still holds with the template picker open', async () => {
      const { container } = await openPicker()
      expectEveryDraggableWired(container)
    })

    it("the sweep still holds on the picker's move step", async () => {
      state.page = twoRegionPage
      const { container } = await openPicker()
      await userEvent.click(screen.getByRole('button', { name: 'Una región' }))
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
      expectEveryDraggableWired(container)
    })

    it('picking a template that drops a populated region asks where its components go', async () => {
      state.page = twoRegionPage
      await openPicker()
      // one-region has no RIGHT: it dies, and it is not empty ('right' lives there)
      await userEvent.click(screen.getByRole('button', { name: 'Una región' }))
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
      // the live canvas behind this double still shows its own RIGHT region (untouched, nothing
      // applied yet), so the orphan step's own copy of "Derecha" has to be found inside the dialog
      const dialog = within(screen.getByRole('dialog'))
      // step 2 asks the one question that can lose the admin's work: the header must say so, not
      // still show step 1's "choose a template" copy
      expect(dialog.getByText('¿A dónde van estos componentes?')).toBeInTheDocument()
      expect(dialog.getByText('Derecha')).toBeInTheDocument()
      expect(dialog.getByText('1 componente se mueve')).toBeInTheDocument()
    })

    it('accepting the default destination and clicking Apply moves the orphan -- radix never fires onValueChange for a re-pick of the value already shown', async () => {
      state.page = twoRegionPage
      await openPicker()
      await userEvent.click(screen.getByRole('button', { name: 'Una región' }))
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
      // never touch the select: the destination must already be picked, or retemplate() silently refuses
      await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
      // the dialog closed and the canvas now shows one region, both texts landed inside it
      expect(await screen.findByText('left')).toBeInTheDocument()
      expect(screen.getByText('right')).toBeInTheDocument()
      expect(screen.queryByText('Derecha')).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(state.save).toHaveBeenCalledWith({
        generated: false,
        page: {
          objectName: 'predio',
          name: 'predio_detail',
          label: 'Detalle de predio',
          kind: 'RECORD_DETAIL',
          template: 'one-region',
          definition: {
            page: pageNode([regionNode('MAIN', [leaf('TEXT', { content: 'left' }), leaf('TEXT', { content: 'right' })])])
          }
        }
      })
    })

    it('opens already on the current template, which orphans nothing, so the footer already reads Apply', async () => {
      // flatPage carries one-region; picked starts out as the current template, no move to ask about
      await openPicker()
      expect(screen.getByRole('button', { name: 'Aplicar' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument()
      // the other half of the step header: without this, inverting the condition breaks only
      // step 2, and a mutation that headed both steps with step 2's copy would pass
      expect(screen.getByText('Elegir plantilla')).toBeInTheDocument()
    })
  })
})

// the second defence, tested apart from the first on purpose: the inspector hiding the bin protects
// today's UI, this protects whatever calls removeNode next.
describe('removeNode', () => {
  const tree = [
    {
      uid: 'page',
      type: 'PAGE',
      children: [{ uid: 'region', type: 'REGION', children: [{ uid: 'leaf', type: 'TEXT', children: [] }] }]
    }
  ] as unknown as Parameters<typeof removeNode>[0]

  it('deletes an ordinary node', () => {
    expect(removeNode(tree, 'leaf')[0].children[0].children).toHaveLength(0)
  })

  it('refuses to delete a region, however the ask arrives', () => {
    expect(removeNode(tree, 'region')[0].children).toHaveLength(1)
  })

  it('refuses to delete the page', () => {
    expect(removeNode(tree, 'page')).toHaveLength(1)
  })
})
