export { GIS_MODULE_ID, gisModule, type GisModuleOptions } from './module'
export { gisMessages } from './i18n'
export { MapView, type FeatureStyle, type MapViewProps, type WmsLayerSpec } from './components/LazyMapView'
export { MapLegend, type MapLegendProps } from './components/MapLegend'
export { GeometryField } from './components/GeometryField'
export { useAttributeStyle, useFeatures, useStyleClasses } from './api'
export {
  colorExpression,
  legendItems,
  styleTypeFor,
  type AttributeStyle,
  type LegendItem,
  type StyleClass,
  type StyleClasses,
  type StyleType
} from './lib/style'
export type { MapViewRecord } from './mapViews/types'
export { featureIdOf, geometryFields } from './lib/geo'
export { WMS_TILE_SIZE, wmsTileUrl } from './lib/wms'
export type { BasemapSpec, MapInitialView } from './lib/basemap'
export type { Feature, FeatureCollection, GeoJsonGeometry, GeometryMeta, GeometryType } from './types'
