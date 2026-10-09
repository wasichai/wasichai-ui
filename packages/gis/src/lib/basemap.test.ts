import type { StyleSpecification } from 'maplibre-gl'
import { describe, expect, it } from 'vitest'
import { DEFAULT_BASEMAP, basemapStyle, keepOverlays } from './basemap'

const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

describe('basemapStyle', () => {
  it('keeps the OpenStreetMap raster as the default', () => {
    expect(basemapStyle(DEFAULT_BASEMAP)).toStrictEqual({
      version: 8,
      sources: { basemap: { type: 'raster', tiles: [OSM], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
      layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }]
    })
  })

  it('builds a raster source from the tiles, size, attribution and max zoom it is given', () => {
    const tiles = ['https://a.tiles.example.org/{z}/{x}/{y}.png', 'https://b.tiles.example.org/{z}/{x}/{y}.png']
    expect(basemapStyle({ type: 'raster', tiles, tileSize: 512, attribution: '© Example', maxzoom: 18 })).toStrictEqual({
      version: 8,
      sources: { basemap: { type: 'raster', tiles, tileSize: 512, attribution: '© Example', maxzoom: 18 } },
      layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }]
    })
  })

  it('leaves out what the raster spec leaves out', () => {
    const style = basemapStyle({ type: 'raster', tiles: ['https://tiles.example.org/{z}/{x}/{y}.png'] }) as StyleSpecification
    expect(style.sources.basemap).toStrictEqual({ type: 'raster', tiles: ['https://tiles.example.org/{z}/{x}/{y}.png'], tileSize: 256 })
  })

  it('hands a style url to maplibre as is', () => {
    expect(basemapStyle({ type: 'style', url: 'https://tiles.example.org/styles/streets/style.json' })).toBe(
      'https://tiles.example.org/styles/streets/style.json'
    )
  })

  it('draws only a background color without a base map', () => {
    expect(basemapStyle({ type: 'none' })).toStrictEqual({
      version: 8,
      sources: {},
      layers: [{ id: 'basemap', type: 'background', paint: { 'background-color': '#f4f5f7' } }]
    })
  })
})

describe('keepOverlays', () => {
  const geojson = { type: 'geojson' as const, data: { type: 'FeatureCollection' as const, features: [] } }
  const previous: StyleSpecification = {
    version: 8,
    glyphs: 'https://tiles.example.org/fonts/{fontstack}/{range}.pbf',
    sprite: 'https://tiles.example.org/sprite',
    sources: {
      openmaptiles: { type: 'vector', url: 'https://tiles.example.org/tiles.json' },
      'wasichai-wms-a': { type: 'raster', tiles: ['https://geo.example.org/wms?layers=a'], tileSize: 256 },
      'wasichai-features': geojson,
      'wasichai-draw-point': geojson
    },
    layers: [
      { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water' },
      { id: 'wasichai-wms-a', type: 'raster', source: 'wasichai-wms-a' },
      { id: 'wasichai-features-fill', type: 'fill', source: 'wasichai-features' },
      { id: 'wasichai-draw-point', type: 'circle', source: 'wasichai-draw-point' }
    ]
  }

  it('carries the features, wms and drawing layers over, on top of the new base map and in their order', () => {
    const merged = keepOverlays(previous, basemapStyle({ type: 'none' }) as StyleSpecification)
    expect(merged.layers.map((layer) => layer.id)).toEqual(['basemap', 'wasichai-wms-a', 'wasichai-features-fill', 'wasichai-draw-point'])
    expect(Object.keys(merged.sources)).toEqual(['wasichai-wms-a', 'wasichai-features', 'wasichai-draw-point'])
    expect(merged.sources['wasichai-features']).toBe(geojson)
  })

  it('drops every layer, source, glyph and sprite of the style it replaces', () => {
    const merged = keepOverlays(previous, basemapStyle(DEFAULT_BASEMAP) as StyleSpecification)
    expect(merged.layers.map((layer) => layer.id)).not.toContain('water')
    expect(merged.sources.openmaptiles).toBeUndefined()
    expect(merged.glyphs).toBeUndefined()
    expect(merged.sprite).toBeUndefined()
  })

  it("keeps the next style's own glyphs and sprite", () => {
    const next: StyleSpecification = {
      version: 8,
      glyphs: 'https://other.example.org/{fontstack}/{range}.pbf',
      sprite: 'https://other.example.org/sprite',
      sources: {},
      layers: []
    }
    expect(keepOverlays(previous, next)).toMatchObject({ glyphs: next.glyphs, sprite: next.sprite })
  })

  it('returns the next style as is when there was none before', () => {
    const next = basemapStyle(DEFAULT_BASEMAP) as StyleSpecification
    expect(keepOverlays(undefined, next)).toStrictEqual(next)
  })
})
