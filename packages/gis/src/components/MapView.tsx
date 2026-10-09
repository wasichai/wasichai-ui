import { useEffect, useRef } from 'react'
import { GeoJSONSource, Map as MapLibreMap, NavigationControl, Popup, RasterTileSource, ScaleControl, setWorkerUrl, type MapLayerMouseEvent } from 'maplibre-gl'
import { TerraDraw, TerraDrawLineStringMode, TerraDrawPointMode, TerraDrawPolygonMode } from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import { WMS_TILE_SIZE, wmsTileUrl } from '../lib/wms'
import { DEFAULT_BASEMAP, DEFAULT_INITIAL_VIEW, basemapStyle, keepOverlays, type BasemapSpec, type MapInitialView } from '../lib/basemap'
import { boundsOf } from '../lib/geo'
import { popupHtml } from '../lib/popup'
import { applyMapWorkerUrl } from '../lib/mapWorker'
import { cn } from '@wasichai/ui'
import { useMapDefaults } from './MapDefaults'
import type { Feature, FeatureCollection, GeoJsonGeometry } from '../types'

const SOURCE = 'wasichai-features'
// wms layers get their own id namespace so we can find ours again in the style
const WMS_PREFIX = 'wasichai-wms-'

export interface WmsLayerSpec {
  id: string
  url: string
  opacity?: number
}

export interface MapViewProps {
  featureCollection?: FeatureCollection | null
  drawMode?: 'point' | 'linestring' | 'polygon' | null
  drawValue?: GeoJsonGeometry | null
  onDrawChange?: (geometry: GeoJsonGeometry | null) => void
  onFeatureClick?: (feature: Feature) => void
  wmsLayers?: WmsLayerSpec[]
  // what the map draws under everything else. default: the OpenStreetMap raster
  basemap?: BasemapSpec
  // camera before features arrive. read once, when the map is built
  initialView?: MapInitialView
  className?: string
}

export function MapView({ featureCollection, drawMode, drawValue, onDrawChange, onFeatureClick, wmsLayers, basemap, initialView, className }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const draw = useRef<TerraDraw | null>(null)
  const drawChange = useRef(onDrawChange)
  const featureClick = useRef(onFeatureClick)
  // style may be "loaded" before 'load' fires and the source exists: queue work until it does
  const ready = useRef(false)
  const queued = useRef<(() => void)[]>([])
  drawChange.current = onDrawChange
  featureClick.current = onFeatureClick
  // callers rebuild this array every render: compare by value, read the fresh one from the ref
  const wms = useRef<WmsLayerSpec[]>([])
  wms.current = wmsLayers ?? []
  const wmsKey = JSON.stringify(wms.current)
  // prop, then gisModule's default, then OSM over Lima
  const defaults = useMapDefaults()
  // the build effect runs once: it reads the latest spec and view from refs
  const basemapRef = useRef<BasemapSpec>(DEFAULT_BASEMAP)
  basemapRef.current = basemap ?? defaults.basemap ?? DEFAULT_BASEMAP
  // callers write the spec inline: compare by value, like wmsLayers
  const basemapKey = JSON.stringify(basemapRef.current)
  // key of the base map the map shows, or is switching to
  const shown = useRef<string | null>(null)
  const view = useRef<MapInitialView>(DEFAULT_INITIAL_VIEW)
  view.current = initialView ?? defaults.initialView ?? DEFAULT_INITIAL_VIEW

  const whenReady = (task: () => void) => {
    if (ready.current) task()
    else queued.current.push(task)
  }

  useEffect(() => {
    if (!container.current || map.current) return
    applyMapWorkerUrl(setWorkerUrl)
    const instance = new MapLibreMap({
      container: container.current,
      style: basemapStyle(basemapRef.current),
      center: view.current.center,
      zoom: view.current.zoom,
      attributionControl: { compact: true }
    })
    shown.current = JSON.stringify(basemapRef.current)
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    instance.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')

    instance.on('load', () => {
      instance.addSource(SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })
      instance.addLayer({
        id: `${SOURCE}-fill`,
        type: 'fill',
        source: SOURCE,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#4f6ef7', 'fill-opacity': 0.25 }
      })
      instance.addLayer({
        id: `${SOURCE}-line`,
        type: 'line',
        source: SOURCE,
        filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'LineString']]],
        paint: { 'line-color': '#3b53c4', 'line-width': 2 }
      })
      instance.addLayer({
        id: `${SOURCE}-point`,
        type: 'circle',
        source: SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#4f6ef7',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      })

      for (const layer of [`${SOURCE}-fill`, `${SOURCE}-line`, `${SOURCE}-point`]) {
        instance.on('click', layer, (event: MapLayerMouseEvent) => {
          const hit = event.features?.[0]
          if (!hit) return
          const feature: Feature = {
            type: 'Feature',
            id: String(hit.id ?? hit.properties?.id ?? ''),
            geometry: hit.geometry as GeoJsonGeometry,
            properties: (hit.properties ?? {}) as Record<string, unknown>
          }
          featureClick.current?.(feature)
          new Popup({ closeButton: false }).setLngLat(event.lngLat).setHTML(popupHtml(feature.properties)).addTo(instance)
        })
        instance.on('mouseenter', layer, () => {
          instance.getCanvas().style.cursor = 'pointer'
        })
        instance.on('mouseleave', layer, () => {
          instance.getCanvas().style.cursor = ''
        })
      }

      ready.current = true
      for (const task of queued.current) task()
      queued.current = []
    })

    // the canvas keeps the size it was built at. a map inside a tab goes to nothing while the tab
    // is hidden and comes back, so watch the box rather than trust it.
    const resize = new ResizeObserver(() => instance.resize())
    resize.observe(container.current)

    map.current = instance
    return () => {
      resize.disconnect()
      draw.current?.stop()
      draw.current = null
      ready.current = false
      queued.current = []
      instance.remove()
      map.current = null
      shown.current = null
    }
  }, [])

  // render features and zoom to them
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    whenReady(() => {
      const source = instance.getSource(SOURCE) as GeoJSONSource | undefined
      if (!source) return
      const features = featureCollection?.features ?? []
      source.setData({
        type: 'FeatureCollection',
        features: features
          .filter((feature) => feature.geometry)
          .map((feature) => ({
            type: 'Feature' as const,
            id: feature.id,
            geometry: feature.geometry as never,
            // the id of a feature is "<record>:<geometry>" now, so the record id travels apart
            properties: { ...feature.properties, id: feature.id }
          }))
      })
      const bounds = boundsOf(features.map((feature) => feature.geometry))
      if (bounds) instance.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 400 })
    })
  }, [featureCollection])

  // wms overlays: diffed, never rebuilt from scratch, and always under the geojson layers
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    whenReady(() => syncWmsLayers(instance, wms.current))
  }, [wmsKey])

  // base map swap: same map, our overlays merged into the new style. maplibre diffs it in, or rebuilds
  // the style when it cannot diff, and transformStyle carries them either way
  useEffect(() => {
    const instance = map.current
    if (!instance || shown.current === basemapKey) return
    shown.current = basemapKey
    whenReady(() => instance.setStyle(basemapStyle(basemapRef.current), { transformStyle: keepOverlays }))
  }, [basemapKey])

  // drawing is opt-in: only mounted when the object actually has geometry
  useEffect(() => {
    const instance = map.current
    if (!instance || !drawMode) return

    whenReady(() => {
      const terraDraw = new TerraDraw({
        // our prefix, not terra-draw's 'td': keepOverlays carries the drawing across a base map swap
        adapter: new TerraDrawMapLibreGLAdapter({ map: instance, prefixId: 'wasichai-draw' }),
        modes: [new TerraDrawPointMode(), new TerraDrawLineStringMode(), new TerraDrawPolygonMode()]
      })
      terraDraw.start()
      terraDraw.setMode(drawMode)
      terraDraw.on('finish', () => {
        const snapshot = terraDraw.getSnapshot()
        const last = snapshot.at(-1)
        // one geometry per record: drop anything drawn before
        for (const feature of snapshot.slice(0, -1)) {
          terraDraw.removeFeatures([feature.id as string])
        }
        drawChange.current?.((last?.geometry as GeoJsonGeometry) ?? null)
      })
      draw.current = terraDraw
      if (drawValue) {
        const bounds = boundsOf([drawValue])
        if (bounds) instance.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 0 })
      }
    })

    return () => {
      draw.current?.stop()
      draw.current = null
    }
  }, [drawMode, drawValue])

  return <div ref={container} className={cn('h-full w-full', className)} data-testid="map-view" />
}

// add, drop, retint and reorder the wms rasters in place. the map instance survives.
function syncWmsLayers(instance: MapLibreMap, specs: WmsLayerSpec[]): void {
  const wanted = new Map(specs.map((spec) => [WMS_PREFIX + spec.id, spec]))
  const present = (instance.getStyle().layers ?? []).map((layer) => layer.id).filter((id) => id.startsWith(WMS_PREFIX))

  for (const id of present) {
    if (!wanted.has(id)) removeWmsLayer(instance, id)
  }

  // geojson layers stay on top: everything goes in before the first of them
  const before = instance.getLayer(`${SOURCE}-fill`) ? `${SOURCE}-fill` : undefined

  for (const [id, spec] of wanted) {
    const tiles = wmsTileUrl(spec.url)
    const source = instance.getSource(id)
    const current = source instanceof RasterTileSource ? source.tiles?.[0] : undefined
    if (current !== tiles) {
      // a raster source cannot change its template: rebuild just this one
      removeWmsLayer(instance, id)
      instance.addSource(id, { type: 'raster', tiles: [tiles], tileSize: WMS_TILE_SIZE })
      instance.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': spec.opacity ?? 1 } }, before)
    } else {
      instance.setPaintProperty(id, 'raster-opacity', spec.opacity ?? 1)
    }
  }

  // moving each one in array order under the geojson layers stacks them last-on-top
  for (const spec of specs) {
    const id = WMS_PREFIX + spec.id
    if (instance.getLayer(id)) instance.moveLayer(id, before)
  }
}

function removeWmsLayer(instance: MapLibreMap, id: string): void {
  if (instance.getLayer(id)) instance.removeLayer(id)
  if (instance.getSource(id)) instance.removeSource(id)
}
