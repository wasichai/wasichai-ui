import type { ReactElement } from 'react'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { gisModule } from '../module'
import { node, predio } from '../test/fixtures'
import { MapPreview } from './MapPreview'
import { ALL_GEOMETRIES, MapSettings, geometryPatch } from './MapSettings'

const withGis = (ui: ReactElement) => renderWithProviders(ui, { modules: [gisModule()] })

describe('MAP in the page builder', () => {
  it('offers itself to the builder with a label, an icon and no shape picked yet', () => {
    const map = gisModule().pageComponents!.MAP
    expect(map.labelKey).toBe('gis:pages.types.MAP')
    expect(map.icon).toBeDefined()
    expect(map.defaults).toBeUndefined()
    expect(map.settings).toBe(MapSettings)
    expect(map.preview).toBe(MapPreview)
  })

  it('names the geometry a targeted map will draw', () => {
    withGis(<MapPreview component={node('MAP', { geometry: 'lote' })} definition={predio} />)
    expect(screen.getByText('Lote')).toBeInTheDocument()
    expect(screen.getByText('lote · POLYGON')).toBeInTheDocument()
  })

  it('says every geometry draws when none is targeted', () => {
    withGis(<MapPreview component={node('MAP')} definition={predio} />)
    expect(screen.getByText('todas las geometrías')).toBeInTheDocument()
  })

  it('flags a targeted geometry that no longer exists', () => {
    withGis(<MapPreview component={node('MAP', { geometry: 'borrada' })} definition={predio} />)
    expect(screen.getByText('borrada')).toHaveClass('text-danger')
  })

  it('renders no interactive control in the preview', () => {
    const { container } = withGis(<MapPreview component={node('MAP')} definition={predio} />)
    expect(container.querySelectorAll('button, input, select, textarea, a')).toHaveLength(0)
  })

  it('shows the shape picker on "every geometry" until one is chosen', () => {
    withGis(<MapSettings component={node('MAP')} definition={predio} objectName="predio" onChange={vi.fn()} />)
    expect(screen.getByText('Geometría')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('Todas las geometrías')
  })

  it('turns the picker value into the component patch', () => {
    expect(geometryPatch(ALL_GEOMETRIES)).toEqual({ geometry: null })
    expect(geometryPatch('lote')).toEqual({ geometry: 'lote' })
  })
})
