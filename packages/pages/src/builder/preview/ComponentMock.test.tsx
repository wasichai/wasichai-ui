import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { coreModule, type FieldMeta, type ObjectDefinition, type PageComponent, type RelatedSide } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { pagesModule } from '../../module'
import { pinModule } from '../../test/fakeModules'
import { ComponentMock } from './ComponentMock'

function leaf(type: PageComponent['type'], extra: Partial<PageComponent> = {}): PageComponent {
  return { type, column: 1, title: null, layout: 'single-column', children: [], relationship: null, fields: null, content: null, ...extra }
}

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
    visible: true,
    editable: true
  }
}

const definition: ObjectDefinition = {
  id: 'o1',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  fields: [field('codigo', 'Código'), field('area', 'Área')]
}

const sides: RelatedSide[] = [
  { relationship: 'predio_titular', label: 'Titular', type: 'MANY_TO_ONE', objectName: 'titular', objectLabel: 'Titular', many: false }
]

// coreModule owns the 'builder' nav group pagesModule() targets: the registry needs both, or it
// refuses to resolve pagesModule's own nav entry
function mock(component: PageComponent, withSides: RelatedSide[] = []) {
  return renderWithProviders(<ComponentMock component={component} definition={definition} sides={withSides} />, {
    modules: [coreModule, pagesModule(), pinModule]
  })
}

describe('ComponentMock', () => {
  it('draws a form with the field labels the object really has', () => {
    mock(leaf('FORM'))
    expect(screen.getByText('Código')).toBeInTheDocument()
    expect(screen.getByText('Área')).toBeInTheDocument()
  })

  it('draws only the named fields, in the order they were picked', () => {
    mock(leaf('FORM', { fields: ['area'] }))
    expect(screen.getByText('Área')).toBeInTheDocument()
    expect(screen.queryByText('Código')).not.toBeInTheDocument()
  })

  it('shows the label of the relationship a related list points at', () => {
    mock(leaf('RELATED_LIST', { relationship: 'predio_titular' }), sides)
    expect(screen.getByText('Titular')).toBeInTheDocument()
  })

  it('says when a related list points at a relationship that is gone', () => {
    mock(leaf('RELATED_LIST', { relationship: 'fantasma' }), sides)
    expect(screen.getByText(/fantasma/)).toBeInTheDocument()
  })

  it('draws the action title, not a real button', () => {
    mock(leaf('ACTION', { title: 'Aprobar', style: 'PRIMARY' }))
    expect(screen.getByText('Aprobar')).toBeInTheDocument()
  })

  it('draws the given text, or a placeholder when it is empty', () => {
    mock(leaf('TEXT', { content: 'Hola mundo' }))
    expect(screen.getByText('Hola mundo')).toBeInTheDocument()
  })

  it('draws a module component through its own preview, with the object definition in hand', () => {
    mock(leaf('PIN', { color: 'verde' }))
    expect(screen.getByTestId('pin-preview')).toHaveTextContent('chincheta verde en predio')
  })

  it('labels a component whose module is not installed instead of drawing nothing', () => {
    mock(leaf('MAP', { geometry: 'geom' }))
    expect(screen.getByText('MAP')).toBeInTheDocument()
  })

  // nothing inside a mock may fetch, mount a map, or take a click
  it('renders no interactive control at all', () => {
    const types: PageComponent['type'][] = ['FORM', 'RELATED_LIST', 'HISTORY', 'TEXT', 'ACTION', 'PIN', 'MAP']
    types.forEach((type) => {
      const { container, unmount } = mock(leaf(type, { relationship: 'predio_titular' }), sides)
      expect(container.querySelectorAll('input, button, select, textarea, a')).toHaveLength(0)
      unmount()
    })
  })
})
