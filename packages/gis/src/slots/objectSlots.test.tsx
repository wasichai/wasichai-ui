import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { gisModule } from '../module'
import { flat, predio } from '../test/fixtures'
import { GeoObjectsCard, GeometryCell, GeometryTileDetail } from './objectSlots'

const withGis = { modules: [gisModule()] }

describe('gis on the dashboard and the objects page', () => {
  it('counts the objects that carry a geometry', () => {
    renderWithProviders(<GeoObjectsCard objects={[predio, flat]} loading={false} />, withGis)
    expect(screen.getByText('Objetos con geometría')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows a dash while the objects load', () => {
    renderWithProviders(<GeoObjectsCard objects={[]} loading />, withGis)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('names the geometry type and EPSG code in the objects table, or says there is none', () => {
    const { rerender } = renderWithProviders(<GeometryCell object={predio} />, withGis)
    expect(screen.getByText('POLYGON · EPSG:32718')).toBeInTheDocument()
    rerender(<GeometryCell object={flat} />)
    expect(screen.getByText('Sin geometría')).toBeInTheDocument()
  })

  it('adds the same line to each dashboard tile', () => {
    const { rerender } = renderWithProviders(<GeometryTileDetail object={predio} />, withGis)
    expect(screen.getByText('POLYGON · EPSG:32718')).toBeInTheDocument()
    rerender(<GeometryTileDetail object={flat} />)
    expect(screen.getByText('Sin geometría')).toBeInTheDocument()
  })
})
