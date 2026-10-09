import type { StyleSpecification } from 'maplibre-gl'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { keepOverlays } from '../lib/basemap'
import { MapView } from './MapView'

// maplibre cannot run in jsdom: the double records what the map was built with and lets the test fire its events
const { FakeMap, adapters } = vi.hoisted(() => {
  type Handler = () => void
  class FakeMap {
    static instances: FakeMap[] = []
    options: { style: StyleSpecification | string; center: [number, number]; zoom: number }
    style: StyleSpecification
    handlers = new Map<string, Handler[]>()
    setStyle = vi.fn()
    remove = vi.fn()
    constructor(options: FakeMap['options']) {
      this.options = options
      this.style = typeof options.style === 'string' ? { version: 8, sources: {}, layers: [] } : options.style
      FakeMap.instances.push(this)
    }
    on(event: string, layerOrHandler: string | Handler, _handler?: Handler) {
      // layer-scoped handlers (click on a layer) never fire here
      if (typeof layerOrHandler === 'function') this.handlers.set(event, [...(this.handlers.get(event) ?? []), layerOrHandler])
      return this
    }
    fire(event: string) {
      for (const handler of this.handlers.get(event) ?? []) handler()
    }
    getStyle() {
      return this.style
    }
    addControl() {
      return this
    }
    addSource() {}
    addLayer() {}
    getSource() {
      return undefined
    }
    getLayer() {
      return undefined
    }
    moveLayer() {}
    fitBounds() {}
    resize() {}
    getCanvas() {
      return { style: {} }
    }
  }
  return { FakeMap, adapters: [] as Record<string, unknown>[] }
})

vi.mock('maplibre-gl', () => ({
  Map: FakeMap,
  NavigationControl: class {},
  ScaleControl: class {},
  Popup: class {},
  RasterTileSource: class {},
  GeoJSONSource: class {},
  setWorkerUrl: vi.fn()
}))
vi.mock('terra-draw', () => ({
  TerraDraw: class {
    start() {}
    stop() {}
    setMode() {}
    on() {}
  },
  TerraDrawPointMode: class {},
  TerraDrawLineStringMode: class {},
  TerraDrawPolygonMode: class {}
}))
vi.mock('terra-draw-maplibre-gl-adapter', () => ({
  TerraDrawMapLibreGLAdapter: class {
    constructor(options: Record<string, unknown>) {
      adapters.push(options)
    }
  }
}))

const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ORG = 'https://tiles.example.org/{z}/{x}/{y}.png'

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  // no workerUrl in these tests: silence the one-time warning
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  FakeMap.instances.length = 0
  adapters.length = 0
})

describe('MapView base map', () => {
  it('draws the OpenStreetMap raster over Lima when nothing is configured', () => {
    render(<MapView />)
    expect(FakeMap.instances).toHaveLength(1)
    const { options } = FakeMap.instances[0]
    expect(options.style).toMatchObject({ sources: { basemap: { type: 'raster', tiles: [OSM], attribution: '© OpenStreetMap contributors' } } })
    expect(options.center).toEqual([-77.04, -12.05])
    expect(options.zoom).toBe(11)
  })

  it('requests the tiles of the base map it is given', () => {
    render(<MapView basemap={{ type: 'raster', tiles: [ORG], attribution: '© Example' }} />)
    expect(FakeMap.instances[0].options.style).toMatchObject({ sources: { basemap: { tiles: [ORG], attribution: '© Example' } } })
  })

  it('loads a style url as the whole base map', () => {
    render(<MapView basemap={{ type: 'style', url: 'https://tiles.example.org/style.json' }} />)
    expect(FakeMap.instances[0].options.style).toBe('https://tiles.example.org/style.json')
  })

  it('opens on the initial view it is given', () => {
    render(<MapView initialView={{ center: [-71.54, -16.41], zoom: 13 }} />)
    expect(FakeMap.instances[0].options).toMatchObject({ center: [-71.54, -16.41], zoom: 13 })
  })
})

describe('MapView base map swap', () => {
  const A = { type: 'raster' as const, tiles: [ORG] }
  const B = { type: 'raster' as const, tiles: ['https://other.example.org/{z}/{x}/{y}.png'] }
  const loaded = () => act(() => FakeMap.instances[0].fire('load'))

  it('swaps the base map in place, never rebuilding the map', () => {
    const { rerender } = render(<MapView basemap={A} />)
    loaded()
    rerender(<MapView basemap={B} />)
    const map = FakeMap.instances[0]
    expect(FakeMap.instances).toHaveLength(1)
    expect(map.remove).not.toHaveBeenCalled()
    expect(map.setStyle).toHaveBeenCalledTimes(1)
    expect(map.setStyle.mock.calls[0][0]).toMatchObject({ sources: { basemap: { tiles: B.tiles } } })
  })

  it('carries features, wms layers and the drawing over through transformStyle', () => {
    const { rerender } = render(<MapView basemap={A} />)
    loaded()
    rerender(<MapView basemap={{ type: 'style', url: 'https://tiles.example.org/style.json' }} />)
    const [style, options] = FakeMap.instances[0].setStyle.mock.calls[0]
    expect(style).toBe('https://tiles.example.org/style.json')
    const previous: StyleSpecification = {
      version: 8,
      sources: { 'wasichai-features': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } },
      layers: [{ id: 'wasichai-features-fill', type: 'fill', source: 'wasichai-features' }]
    }
    const next: StyleSpecification = { version: 8, sources: {}, layers: [{ id: 'water', type: 'background' }] }
    expect(options.transformStyle(previous, next)).toStrictEqual(keepOverlays(previous, next))
  })

  it('ignores a new basemap object with the same value', () => {
    const { rerender } = render(<MapView basemap={A} />)
    loaded()
    rerender(<MapView basemap={{ type: 'raster', tiles: [ORG] }} />)
    expect(FakeMap.instances[0].setStyle).not.toHaveBeenCalled()
  })

  it('waits for the first load before swapping', () => {
    const { rerender } = render(<MapView basemap={A} />)
    rerender(<MapView basemap={B} />)
    expect(FakeMap.instances[0].setStyle).not.toHaveBeenCalled()
    loaded()
    expect(FakeMap.instances[0].setStyle).toHaveBeenCalledTimes(1)
  })

  it('goes back to the default when the prop is dropped', () => {
    const { rerender } = render(<MapView basemap={B} />)
    loaded()
    rerender(<MapView />)
    expect(FakeMap.instances[0].setStyle.mock.calls[0][0]).toMatchObject({ sources: { basemap: { tiles: [OSM] } } })
  })

  it('draws under its own prefix, so a swap keeps the drawing', () => {
    render(<MapView drawMode="polygon" />)
    loaded()
    expect(adapters).toHaveLength(1)
    expect(adapters[0]).toMatchObject({ prefixId: 'wasichai-draw' })
  })
})
