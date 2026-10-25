import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { gisModule } from '../module'
import { featureStyleOf, legendItems, type AttributeStyle, type StyleClasses } from '../lib/style'
import { field, geometryField } from '../test/fixtures'
import type { ObjectDefinition } from '@wasichai/core'
import type { MapViewRecord } from '../mapViews/types'
import { MapPage } from './MapPage'

const tramo: ObjectDefinition = {
  id: 'o3',
  name: 'tramo',
  label: 'Tramo',
  pluralLabel: 'Tramos',
  description: null,
  enabled: true,
  geometry: { type: 'LINESTRING', srid: 4326, dimension: 2 },
  fields: [
    field('via', 'Vía'),
    field('arancel', 'Arancel', { type: 'DECIMAL' }),
    field('inscrito', 'Inscrito', { type: 'DATE' }),
    geometryField('eje', 'Eje', 'LINESTRING')
  ]
}

const quantiles: StyleClasses = {
  by: 'arancel',
  type: 'quantiles',
  classes: [
    { label: '0 – 10', color: '#ffffcc', min: 0, max: 10 },
    { label: '10 – 20', color: '#800026', min: 10, max: 20 }
  ]
}

const { state } = vi.hoisted(() => ({
  state: {
    styles: [] as (AttributeStyle | null | undefined)[],
    publish: vi.fn(),
    save: vi.fn(),
    view: undefined as MapViewRecord | undefined
  }
}))

// maplibre cannot run in jsdom: the fake prints the paint it was handed
vi.mock('../components/MapView', () => ({
  MapView: ({ featureStyle }: { featureStyle?: unknown }) => <div data-testid="map-view">{JSON.stringify(featureStyle ?? null)}</div>
}))

vi.mock('../api', () => ({
  useFeatures: () => ({ data: { type: 'FeatureCollection', features: [] } }),
  useAttributeStyle: (_object: string | undefined, style: AttributeStyle | null | undefined) => {
    state.styles.push(style)
    const classes = style ? quantiles : undefined
    return { classes, featureStyle: featureStyleOf(classes), legend: legendItems(classes), isLoading: false, error: null }
  }
}))

vi.mock('../layers/api', () => ({
  usePublishLayer: () => ({ mutateAsync: state.publish, isPending: false })
}))

vi.mock('../mapViews/api', () => ({
  useMapView: (_object: string | undefined, name: string | undefined) => ({ data: name ? state.view : undefined, isError: false }),
  useMapViews: () => ({ data: [] }),
  useSaveMapView: () => ({ mutateAsync: state.save, isPending: false })
}))

vi.mock('@wasichai/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/core')>()),
  useObjects: () => ({ data: [tramo] }),
  useObjectDefinition: () => ({ data: tramo })
}))

const render = (route: string) => renderWithProviders(<MapPage />, { modules: [gisModule()], route })

// radix select opens on pointer events jsdom does not fully implement
async function pick(name: string, option: string) {
  await userEvent.click(await screen.findByRole('combobox', { name }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

beforeEach(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.scrollIntoView ??= () => {}
  state.styles = []
  state.publish.mockReset().mockResolvedValue({})
  state.save.mockReset()
  state.view = undefined
})

describe('MapPage', () => {
  it('offers only the fields a style can colour by', async () => {
    render('/?object=tramo')
    await userEvent.click(await screen.findByRole('combobox', { name: 'Colorear por' }))
    const options = (await screen.findAllByRole('option')).map((option) => option.textContent)
    expect(options).toEqual(['Sin colorear', 'Vía', 'Arancel'])
  })

  it('colours by the picked field, in five quantiles by default, with a legend', async () => {
    render('/?object=tramo')
    await pick('Colorear por', 'Arancel')
    expect(state.styles.at(-1)).toEqual({ by: 'arancel', type: 'quantiles', classes: 5 })
    expect(screen.getByTestId('map-view')).toHaveTextContent('step')
    expect(screen.getByRole('figure', { name: 'Leyenda' })).toHaveTextContent('10 – 20')
    expect(screen.getByRole('combobox', { name: 'Clases' })).toHaveTextContent('5')
  })

  it('draws plain features and no legend without a style', async () => {
    render('/?object=tramo')
    expect(await screen.findByTestId('map-view')).toHaveTextContent('null')
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar WMS con este estilo' })).not.toBeInTheDocument()
  })

  it('publishes the layer with the style on screen', async () => {
    render('/?object=tramo&by=arancel&type=quantiles&classes=4')
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar WMS con este estilo' }))
    expect(state.publish).toHaveBeenCalledWith({ objectName: 'tramo', geometryName: 'eje', style: { by: 'arancel', type: 'quantiles', classes: 4 } })
    expect(await screen.findByText('Capa publicada con este estilo')).toBeInTheDocument()
  })

  it('saves the map as a view with its geometry and style', async () => {
    state.save.mockResolvedValue({ id: 'v1', name: 'aranceles', label: 'Aranceles', objectName: 'tramo', geometryName: 'eje', style: null })
    render('/?object=tramo&by=arancel&type=quantiles&classes=4')
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar como vista de mapa' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'aranceles')
    await userEvent.type(screen.getByLabelText('Etiqueta'), 'Aranceles')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(state.save).toHaveBeenCalledWith({
      view: { name: 'aranceles', label: 'Aranceles', geometryName: 'eje', style: { by: 'arancel', type: 'quantiles', classes: 4 } },
      exists: false
    })
  })

  it('refuses a view name the server would refuse, before sending it', async () => {
    render('/?object=tramo')
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar como vista de mapa' }))
    await userEvent.type(screen.getByLabelText('Nombre'), '1 malo')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Minúsculas')
    expect(state.save).not.toHaveBeenCalled()
  })

  it('opens a saved view with its style and label', async () => {
    state.view = {
      id: 'v1',
      name: 'aranceles',
      label: 'Aranceles por vía',
      objectName: 'tramo',
      geometryName: 'eje',
      style: { by: 'arancel', type: 'quantiles', classes: 3 }
    }
    render('/?object=tramo&view=aranceles')
    expect(await screen.findByRole('heading', { name: 'Aranceles por vía' })).toBeInTheDocument()
    await vi.waitFor(() => expect(state.styles.at(-1)).toEqual({ by: 'arancel', type: 'quantiles', classes: 3 }))
  })
})
