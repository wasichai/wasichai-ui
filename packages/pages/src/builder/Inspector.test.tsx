import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { coreModule, type WasichaiModule, type FieldMeta, type ObjectDefinition } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { pagesModule } from '../module'
import { pinModule, stampModule } from '../test/fakeModules'
import { Inspector } from './Inspector'
import type { Node } from './pageTree'

vi.mock('@wasichai/ui', async (importOriginal) => ({ ...(await importOriginal<typeof import('@wasichai/ui')>()), ...(await import('../test/uiDoubles')) }))

const field: FieldMeta = {
  id: 'f1',
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
  visible: true,
  editable: true
}

const definition: ObjectDefinition = { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [field] }

function node(type: Node['type'], extra: Partial<Node> = {}): Node {
  return { uid: 'n1', type, column: 1, title: null, layout: 'single-column', children: [], relationship: null, fields: null, content: null, ...extra }
}

// coreModule owns the 'builder' nav group pagesModule() targets: the registry needs both, or it
// refuses to resolve pagesModule's own nav entry
function inspect(target: Node, modules: WasichaiModule[] = []) {
  const onPatch = vi.fn()
  renderWithProviders(
    <Inspector
      node={target}
      parentLayout="single-column"
      definition={definition}
      objectName="predio"
      sides={[]}
      forms={[]}
      objects={['predio']}
      onPatch={onPatch}
      onRemove={() => {}}
    />,
    { modules: [coreModule, pagesModule(), ...modules] }
  )
  return onPatch
}

// the kind picker is the select that offers NAVIGATE
function kindPicker(): HTMLSelectElement {
  return screen.getByRole('option', { name: 'Lleva a otro sitio' }).closest('select') as HTMLSelectElement
}

const optionTexts = (select: HTMLSelectElement) => [...select.options].map((option) => option.textContent)

describe('Inspector ACTION', () => {
  it('lists a module kind first and NAVIGATE last', () => {
    inspect(node('ACTION', { action: 'NAVIGATE', style: 'SECONDARY' }), [stampModule])
    // the leading '' is the double's own blank option
    expect(optionTexts(kindPicker())).toEqual(['', 'Sellar', 'Lleva a otro sitio'])
  })

  it('offers no transition when no module adds an action kind', () => {
    inspect(node('ACTION', { action: 'NAVIGATE', style: 'SECONDARY' }))
    expect(optionTexts(kindPicker())).toEqual(['', 'Lleva a otro sitio'])
    expect(screen.queryByText('Dispara una transición')).not.toBeInTheDocument()
  })

  it('picking a module kind merges that kind defaults into the node', async () => {
    const onPatch = inspect(node('ACTION', { action: 'NAVIGATE', style: 'SECONDARY' }), [stampModule])
    await userEvent.selectOptions(kindPicker(), 'STAMP')
    expect(onPatch).toHaveBeenCalledWith('n1', { style: 'PRIMARY', seal: 'oficial', action: 'STAMP' })
  })

  it('draws the settings the kind brings, and hands its changes back as a patch', async () => {
    const onPatch = inspect(node('ACTION', { action: 'STAMP', style: 'PRIMARY', seal: 'x' }), [stampModule])
    await userEvent.type(screen.getByLabelText('sello'), 'y')
    expect(onPatch).toHaveBeenCalledWith('n1', { seal: 'xy' })
  })

  it('keeps a stored kind whose module is missing on screen, under its raw name', () => {
    inspect(node('ACTION', { action: 'TRANSITION', transition: 'aprobar', style: 'SECONDARY' }))
    expect(kindPicker().value).toBe('TRANSITION')
    expect(optionTexts(kindPicker())).toEqual(['', 'Lleva a otro sitio', 'TRANSITION'])
  })
})

describe('Inspector module components', () => {
  it('draws a module component settings with the object in hand', async () => {
    const onPatch = inspect(node('PIN', { color: 'azul' }), [pinModule])
    expect(screen.getByRole('heading', { name: 'Chincheta' })).toBeInTheDocument()
    expect(screen.getByText('color de predio (1 campos)')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('color'), 'o')
    expect(onPatch).toHaveBeenCalledWith('n1', { color: 'azulo' })
  })

  it('names a component whose module is missing and offers only the built-in settings', () => {
    inspect(node('MAP', { geometry: 'geom' }))
    expect(screen.getByRole('heading', { name: 'MAP' })).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toBeInTheDocument()
    expect(screen.queryByLabelText('color')).not.toBeInTheDocument()
  })

  // a module's settings editor speaks Partial<PageComponent>, but nothing stops it from naming a
  // protected key by hand -- the inspector must strip type/children/uid before the patch ever
  // reaches onPatch, whatever the module sends
  it('strips type, children and uid from a module settings patch before it reaches onPatch', async () => {
    const rogueModule: WasichaiModule = {
      id: 'rogue',
      pageComponents: {
        ROGUE: {
          render: () => null,
          labelKey: 'rogue:label',
          settings: ({ onChange }) => (
            <button type="button" onClick={() => onChange({ type: 'MAP', children: [{ type: 'TEXT' }], uid: 'stolen', color: 'x' } as never)}>
              patch
            </button>
          )
        }
      }
    }
    const onPatch = inspect(node('ROGUE'), [rogueModule])
    await userEvent.click(screen.getByRole('button', { name: 'patch' }))
    expect(onPatch).toHaveBeenCalledWith('n1', { color: 'x' })
  })
})
