import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActionButton } from './ActionButton'
import { renderWithProviders } from '@wasichai/testing'
import { noteModule } from '../../test/fakeModules'
import type { PageComponent } from '../../types/metadata'

function action(extra: Partial<PageComponent>): PageComponent {
  return { type: 'ACTION', column: 1, title: null, layout: 'single-column', children: [], relationship: null, fields: null, content: null, ...extra }
}

describe('ActionButton', () => {
  it('lets the module that owns an action kind draw it', () => {
    renderWithProviders(<ActionButton component={action({ action: 'STAMP', title: 'Aprobar' })} objectName="predio" recordId="r1" />, {
      modules: [noteModule]
    })
    expect(screen.getByRole('button', { name: 'sellar Aprobar' })).toBeInTheDocument()
  })

  it('draws nothing for an action kind no module registered', () => {
    const { container } = renderWithProviders(<ActionButton component={action({ action: 'STAMP' })} objectName="predio" recordId="r1" />)
    expect(container).toBeEmptyDOMElement()
  })

  // the original app defaulted a component with no action kind to TRANSITION; the registry has nothing to
  // default to, so an action with no kind draws nothing rather than guessing one
  it('draws nothing for an action with no kind', () => {
    const { container } = renderWithProviders(<ActionButton component={action({ action: null })} objectName="predio" recordId="r1" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws a link for a navigation, not a button', () => {
    renderWithProviders(<ActionButton component={action({ action: 'NAVIGATE', target: 'nota', title: 'Ver notas' })} objectName="predio" recordId="r1" />)

    expect(screen.getByRole('link', { name: 'Ver notas' })).toHaveAttribute('href', '/data/objects/nota/records')
  })

  it('sends a navigation with no target to the object list', () => {
    renderWithProviders(<ActionButton component={action({ action: 'NAVIGATE', title: 'Ir' })} objectName="predio" recordId="r1" />)

    expect(screen.getByRole('link', { name: 'Ir' })).toHaveAttribute('href', '/data/objects')
  })

  it('opens an external url in a new tab, safely', () => {
    renderWithProviders(
      <ActionButton component={action({ action: 'NAVIGATE', url: 'https://catastro.test', title: 'Catastro' })} objectName="predio" recordId="r1" />
    )

    const link = screen.getByRole('link', { name: 'Catastro' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer noopener')
  })
})
