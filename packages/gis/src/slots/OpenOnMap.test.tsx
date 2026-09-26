import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { gisModule } from '../module'
import { flat, predio } from '../test/fixtures'
import { OpenOnMap } from './OpenOnMap'

describe('open on map', () => {
  it('links a spatial object to the map page, filtered on it', () => {
    renderWithProviders(<OpenOnMap objectName="predio" definition={predio} />, { modules: [gisModule()] })
    expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('href', '/gis/map?object=predio')
  })

  it('follows the base path the app picked', () => {
    renderWithProviders(<OpenOnMap objectName="predio" definition={predio} />, { modules: [gisModule({ basePath: 'geo' })] })
    expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('href', '/geo/map?object=predio')
  })

  it('offers nothing for an object without geometry', () => {
    renderWithProviders(<OpenOnMap objectName="persona" definition={flat} />, { modules: [gisModule()] })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
