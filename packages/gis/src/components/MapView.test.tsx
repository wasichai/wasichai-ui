import type { StyleSpecification } from 'maplibre-gl'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
