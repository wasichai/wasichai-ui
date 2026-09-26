import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LayersPage } from './LayersPage'
import { renderWithProviders } from '@wasichai/testing'
import { gisModule } from '../module'
import type { GeoServerServices, LayerStatus } from './types'

// the mock factories run at import time, so the mutable fixture has to be hoisted with them
const { state } = vi.hoisted(() => ({
  state: {
    services: null as GeoServerServices | null,
    layers: [] as LayerStatus[],
    publish: vi.fn(),
    unpublish: vi.fn()
  }
}))

// maplibre cannot run in jsdom
vi.mock('../components/MapView', () => ({
  MapView: () => <div data-testid="map-view" />
}))

vi.mock('./api', () => ({
  useGeoServerServices: () => ({ data: state.services, isLoading: false, isError: false }),
  useLayers: () => ({ data: state.layers, isLoading: false, isError: false }),
  usePublishLayer: () => ({
    mutateAsync: state.publish,
    isPending: false,
    variables: undefined
  }),
  useUnpublishLayer: () => ({
    mutateAsync: state.unpublish,
    isPending: false,
    variables: undefined
  })
}))

vi.mock('@wasichai/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/core')>()),
  useObjects: () => ({ data: [] })
}))

const services: GeoServerServices = {
  enabled: true,
  url: 'http://localhost:8600/geoserver',
  workspace: 'wasichai',
  wms: 'http://localhost:8600/geoserver/wasichai/wms',
  wfs: 'http://localhost:8600/geoserver/wasichai/wfs',
  wmts: 'http://localhost:8600/geoserver/gwc/service/wmts'
}

const predio: LayerStatus = {
  objectName: 'predio',
  geometryName: 'lote',
  label: 'Predio',
  layerName: 'obj_predio__lote',
  geometryType: 'POLYGON',
  srid: 4326,
  published: true,
  wms: 'http://localhost:8600/geoserver/wasichai/wms?layers=wasichai:obj_predio',
  wfs: 'http://localhost:8600/geoserver/wasichai/wfs?typeName=wasichai:obj_predio'
}

const via: LayerStatus = {
  objectName: 'via',
  geometryName: 'traza',
  label: 'Vía',
  layerName: 'obj_via__traza',
  geometryType: 'LINESTRING',
  srid: 4326,
  published: false,
  wms: '',
  wfs: ''
}

beforeEach(() => {
  state.services = services
  state.layers = [predio, via]
  state.publish = vi.fn().mockResolvedValue(predio)
  state.unpublish = vi.fn().mockResolvedValue(undefined)
})

describe('LayersPage', () => {
  // a row is one geometry of one object, so the technical name names both
  it('renders a row per geometry, naming the object and the column', () => {
    renderWithProviders(<LayersPage />, { modules: [gisModule()] })
    expect(screen.getByText('Predio')).toBeInTheDocument()
    expect(screen.getByText('Vía')).toBeInTheDocument()
    expect(screen.getByText('.lote')).toBeInTheDocument()
    expect(screen.getByText('.traza')).toBeInTheDocument()
    expect(screen.getByText('POLYGON')).toBeInTheDocument()
    expect(screen.getAllByText('EPSG:4326')).toHaveLength(2)
  })

  it('shows the published state and the endpoints of a published layer', () => {
    renderWithProviders(<LayersPage />, { modules: [gisModule()] })
    expect(screen.getByText('Publicada')).toBeInTheDocument()
    expect(screen.getByText('Sin publicar')).toBeInTheDocument()
    expect(screen.getByText(predio.wms)).toBeInTheDocument()
    expect(screen.getByText(predio.wfs)).toBeInTheDocument()
  })

  it('publishes the geometry the row names, not just the object', async () => {
    renderWithProviders(<LayersPage />, { modules: [gisModule()] })
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    expect(state.publish).toHaveBeenCalledWith({ objectName: 'via', geometryName: 'traza' })
  })

  it('unpublishes only after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderWithProviders(<LayersPage />, { modules: [gisModule()] })
    await userEvent.click(screen.getByRole('button', { name: 'Despublicar' }))
    expect(state.unpublish).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Despublicar' }))
    expect(state.unpublish).toHaveBeenCalledWith({ objectName: 'predio', geometryName: 'lote' })
    confirm.mockRestore()
  })

  it('shows the map preview of a published layer on demand', async () => {
    renderWithProviders(<LayersPage />, { modules: [gisModule()] })
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Previsualizar' }))
    expect(await screen.findByTestId('map-view')).toBeInTheDocument()
  })

  it('warns and disables publishing when GeoServer is not configured', () => {
    state.services = { ...services, enabled: false }
    renderWithProviders(<LayersPage />, { modules: [gisModule()] })
    expect(screen.getByText('GeoServer no está configurado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Despublicar' })).toBeDisabled()
    // the object list still renders: Wasichai does not need GeoServer
    expect(screen.getByText('Predio')).toBeInTheDocument()
  })

  it('warns when the services endpoint itself is unreachable', () => {
    state.services = null
    renderWithProviders(<LayersPage />, { modules: [gisModule()] })
    expect(screen.getByText('GeoServer no está configurado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled()
  })
})
