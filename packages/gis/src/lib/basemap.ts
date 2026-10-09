// the base map under every MapView, as a maplibre style, and the merge that keeps our layers across a swap.
// lives here (not in MapView) so it can be tested without loading maplibre in jsdom.
// type import only: this file is reached eagerly through module.tsx, maplibre stays behind the lazy MapView.
import type { StyleSpecification } from 'maplibre-gl'

export type BasemapSpec =
  { type: 'raster'; tiles: string[]; tileSize?: number; attribution?: string; maxzoom?: number } | { type: 'style'; url: string } | { type: 'none' }

export interface MapInitialView {
  center: [number, number] // [lng, lat]
  zoom: number
}

// the original app's map: public OSM raster over Lima
export const DEFAULT_BASEMAP: BasemapSpec = {
  type: 'raster',
  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  attribution: '© OpenStreetMap contributors'
}

export const DEFAULT_INITIAL_VIEW: MapInitialView = { center: [-77.04, -12.05], zoom: 11 }

export const BASEMAP_ID = 'basemap'
export const RASTER_TILE_SIZE = 256
// ui's light --surface-muted. maplibre wants a literal color, and the map area is not themed
export const NO_BASEMAP_BACKGROUND = '#f4f5f7'
// every source and layer MapView adds starts with this: what a base map swap carries over
export const OVERLAY_PREFIX = 'wasichai-'

// a style url goes to maplibre as is: it fetches it (and diffs it in on a swap)
export function basemapStyle(spec: BasemapSpec): StyleSpecification | string {
  if (spec.type === 'style') return spec.url
  if (spec.type === 'none') {
    return { version: 8, sources: {}, layers: [{ id: BASEMAP_ID, type: 'background', paint: { 'background-color': NO_BASEMAP_BACKGROUND } }] }
  }
  return {
    version: 8,
    sources: {
      [BASEMAP_ID]: {
        type: 'raster',
        tiles: spec.tiles,
        tileSize: spec.tileSize ?? RASTER_TILE_SIZE,
        // left out, not undefined: an undefined key still lands in the style json
        ...(spec.attribution !== undefined && { attribution: spec.attribution }),
        ...(spec.maxzoom !== undefined && { maxzoom: spec.maxzoom })
      }
    },
    layers: [{ id: BASEMAP_ID, type: 'raster', source: BASEMAP_ID }]
  }
}

// setStyle's transformStyle: the next base map, with our overlays on top in the order they had.
// anything else of the previous style (its layers, sources, glyphs, sprite) goes.
export function keepOverlays(previous: StyleSpecification | undefined, next: StyleSpecification): StyleSpecification {
  if (!previous) return next
  const ours = (id: string) => id.startsWith(OVERLAY_PREFIX)
  const sources = Object.fromEntries(Object.entries(previous.sources).filter(([id]) => ours(id)))
  return {
    ...next,
    sources: { ...next.sources, ...sources },
    layers: [...next.layers, ...previous.layers.filter((layer) => ours(layer.id))]
  }
}
