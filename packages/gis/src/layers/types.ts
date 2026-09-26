// mirrors the /api/gis contract. lives here, not in types/metadata.ts, because it is gis-only.

export interface LayerStatus {
  objectName: string
  // an object with two geometries owns two layers, so the object alone does not name one
  geometryName: string
  label: string
  layerName: string
  geometryType: string
  srid: number
  published: boolean
  wms: string
  wfs: string
}

export interface GeoServerServices {
  enabled: boolean
  url: string
  workspace: string
  wms: string
  wfs: string
  wmts: string
}
