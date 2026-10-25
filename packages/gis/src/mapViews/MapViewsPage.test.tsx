import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { gisModule } from '../module'
import type { MapViewRecord } from './types'
import { MapViewsPage } from './MapViewsPage'

const { state } = vi.hoisted(() => ({
  state: { views: [] as MapViewRecord[], remove: vi.fn() }
}))

vi.mock('./api', () => ({
  useMapViews: () => ({ data: state.views, isLoading: false, isError: false }),
  useDeleteMapView: () => ({ mutateAsync: state.remove, isPending: false })
}))

vi.mock('@wasichai/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/core')>()),
  useObjects: () => ({ data: [{ id: 'o3', name: 'tramo', pluralLabel: 'Tramos' }] })
}))

const aranceles: MapViewRecord = {
  id: 'v1',
  name: 'aranceles',
  label: 'Aranceles por vía',
  objectName: 'tramo',
  geometryName: 'eje',
  style: { by: 'arancel', type: 'quantiles', classes: 5 }
}

const render = () => renderWithProviders(<MapViewsPage />, { modules: [gisModule()] })

beforeEach(() => {
  state.views = []
  state.remove.mockReset().mockResolvedValue(undefined)
})

describe('MapViewsPage', () => {
  it('says how to get a first one', () => {
    render()
    expect(screen.getByText('Todavía no hay vistas de mapa. Guarda una desde Mapas.')).toBeInTheDocument()
  })

  it('lists each view with its object, geometry and style, opening the map on it', () => {
    state.views = [aranceles, { ...aranceles, id: 'v2', name: 'plano', label: 'Plano', style: null }]
    render()
    expect(screen.getByText('Aranceles por vía')).toBeInTheDocument()
    expect(screen.getAllByText('Tramos')).toHaveLength(2)
    expect(screen.getByText('arancel · Cuantiles (5)')).toBeInTheDocument()
    expect(screen.getByText('Sin colorear')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Abrir' })[0]).toHaveAttribute('href', '/gis/map?object=tramo&view=aranceles')
  })

  it('deletes a view once confirmed', async () => {
    state.views = [aranceles]
    render()
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))
    expect(state.remove).toHaveBeenCalledWith({ objectName: 'tramo', name: 'aranceles' })
  })
})
