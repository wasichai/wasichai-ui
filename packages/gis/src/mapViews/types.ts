import type { AttributeStyle } from '../lib/style'

// a saved map: one object, one of its geometries, an optional colouring (GET /gis/map-views)
export interface MapViewRecord {
  id: string
  name: string
  label: string
  objectName: string
  geometryName: string
  style: AttributeStyle | null
}

export interface MapViewPayload {
  name: string
  label: string
  geometryName: string
  style: AttributeStyle | null
}
