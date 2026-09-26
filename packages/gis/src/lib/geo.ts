import type { FieldMeta, ObjectDefinition } from '@wasichai/core'
import type { GeoJsonGeometry } from '../types'

export type Bounds = [[number, number], [number, number]]

// walk any geojson coordinate nesting and keep the extremes
export function boundsOf(geometries: (GeoJsonGeometry | null | undefined)[]): Bounds | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  const visit = (value: unknown): void => {
    if (!Array.isArray(value)) return
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      const [x, y] = value as [number, number]
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      return
    }
    for (const item of value) visit(item)
  }

  for (const geometry of geometries) {
    if (geometry?.coordinates) visit(geometry.coordinates)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null
  return [
    [minX, minY],
    [maxX, maxY]
  ]
}

export function drawModeFor(geometryType: string): 'point' | 'linestring' | 'polygon' | null {
  switch (geometryType) {
    case 'POINT':
    case 'MULTIPOINT':
      return 'point'
    case 'LINESTRING':
    case 'MULTILINESTRING':
      return 'linestring'
    case 'POLYGON':
    case 'MULTIPOLYGON':
      return 'polygon'
    default:
      return null
  }
}

// the geometry columns of an object, in field order. empty means a flat object.
export function geometryFields(definition: ObjectDefinition): FieldMeta[] {
  return definition.fields.filter((field) => field.type === 'GEOMETRY')
}

// one feature per record per geometry, so two shapes of the same record stay two features.
// maplibre keys feature state on the id, and a repeated id makes them one.
export function featureIdOf(recordId: string, geometry: string): string {
  return `${recordId}:${geometry}`
}
