import type { ReactElement } from 'react'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { gisModule } from '../module'
import { flat, node, point, polygon, predio, recordOf } from '../test/fixtures'
import { MapComponent } from './MapComponent'

// maplibre cannot run in jsdom: the fake prints the feature ids it was handed
vi.mock('../components/MapView', () => ({
  MapView: ({ featureCollection }: { featureCollection?: { features: { id: string }[] } | null }) => (
    <div data-testid="map-view">{(featureCollection?.features ?? []).map((feature) => feature.id).join(',')}</div>
  )
}))

const render = (ui: ReactElement) => renderWithProviders(ui, { modules: [gisModule()] })

describe('MAP page component', () => {
  it('draws one feature per drawn geometry, titled as the admin named it', async () => {
    render(<MapComponent component={node('MAP', { title: 'Ubicación' })} definition={predio} record={recordOf({ lote: polygon, acceso: point })} />)
    expect(screen.getByText('Ubicación')).toBeInTheDocument()
    expect(await screen.findByTestId('map-view')).toHaveTextContent('r1:lote,r1:acceso')
  })

  it('draws only the geometry it targets', async () => {
    render(<MapComponent component={node('MAP', { geometry: 'acceso' })} definition={predio} record={recordOf({ lote: polygon, acceso: point })} />)
    expect(screen.getByText('Mapa')).toBeInTheDocument()
    expect(await screen.findByTestId('map-view')).toHaveTextContent('r1:acceso')
  })

  it('gives a spatial object with nothing drawn an empty map, not an excuse', async () => {
    render(<MapComponent component={node('MAP')} definition={predio} record={recordOf({})} />)
    expect((await screen.findByTestId('map-view')).textContent).toBe('')
  })

  it('says so when the object has no geometry at all', () => {
    render(<MapComponent component={node('MAP')} definition={flat} record={recordOf({})} />)
    expect(screen.getByText('Este objeto no tiene ninguna geometría')).toBeInTheDocument()
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument()
  })
})
