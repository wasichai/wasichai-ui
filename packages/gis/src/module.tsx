import { Globe2, Layers, Map as MapIcon } from 'lucide-react'
import type { WasichaiModule } from '@wasichai/core'
import { gisMessages } from './i18n'
import { setMapWorkerUrl } from './lib/mapWorker'
import { GEOMETRY_AUDIT_FIELD_LABELS, geometryAuditFormatter } from './slots/audit'
import { GeometryInput } from './slots/GeometryInput'
import { GEOMETRY_SETTING_DEFAULTS, GeometrySettingsEditor, geometryPayload } from './slots/geometrySettings'
import { MapComponent } from './slots/MapComponent'
import { MapPreview } from './slots/MapPreview'
import { MapSettings } from './slots/MapSettings'
import { GeoObjectsCard, GeometryCell, GeometryTileDetail } from './slots/objectSlots'
import { OpenOnMap } from './slots/OpenOnMap'

export const GIS_MODULE_ID = 'gis'

export interface GisModuleOptions {
  // url prefix of every route of the module. default keeps the original app's urls (/gis/map, /gis/layers)
  basePath?: string
  // maplibre's worker script, as the app's bundler serves it. see the README, "MapLibre worker"
  workerUrl?: string
}

export function gisModule(options: GisModuleOptions = {}): WasichaiModule {
  setMapWorkerUrl(options.workerUrl)
  return {
    id: GIS_MODULE_ID,
    basePath: options.basePath ?? 'gis',
    routes: [
      { id: 'map', path: 'map', lazy: () => import('./map/MapPage').then((module) => ({ default: module.MapPage })) },
      { id: 'layers', path: 'layers', lazy: () => import('./layers/LayersPage').then((module) => ({ default: module.LayersPage })) }
    ],
    navGroups: [{ id: 'gis', labelKey: 'gis:nav.gis', order: 20 }],
    nav: [
      { group: 'gis', labelKey: 'gis:nav.maps', order: 10, icon: MapIcon, route: 'map' },
      { group: 'gis', labelKey: 'gis:nav.layers', order: 20, icon: Layers, route: 'layers' },
      { group: 'gis', labelKey: 'gis:nav.mapViews', order: 30, icon: Globe2, disabled: true }
    ],
    fieldRenderers: {
      GEOMETRY: {
        section: 'geometries',
        // a unique shape means nothing, and the server refuses it
        uniqueAllowed: false,
        input: GeometryInput,
        settings: { defaults: { ...GEOMETRY_SETTING_DEFAULTS }, editor: GeometrySettingsEditor, toPayload: geometryPayload }
      }
    },
    pageComponents: {
      // no defaults: the original app never set component.geometry on a freshly dropped MAP either. the
      // inspector and preview both read componentGeometry(component), which treats an absent key
      // the same as null (every geometry)
      MAP: { render: MapComponent, labelKey: 'gis:pages.types.MAP', icon: MapIcon, settings: MapSettings, preview: MapPreview }
    },
    recordListActions: [OpenOnMap],
    dashboardCards: [GeoObjectsCard],
    objectColumns: [{ id: 'geometry', headerKey: 'gis:objects.geometry', cell: GeometryCell }],
    objectTileDetails: [GeometryTileDetail],
    auditValueFormatters: [geometryAuditFormatter],
    auditFieldLabels: { ...GEOMETRY_AUDIT_FIELD_LABELS },
    recordQueryKeys: (objectName) => [['features', objectName]],
    i18n: gisMessages
  }
}
