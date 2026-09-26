import type { FieldMeta, ObjectSummary, PageComponent, RecordItem } from '@wasichai/core'

// the gis half of the original app's types/metadata.ts. core carries these keys untyped through its
// index signatures; the accessors below are the only place gis reads them back.

export type GeometryType = 'NO_GEOMETRY' | 'POINT' | 'LINESTRING' | 'POLYGON' | 'MULTIPOINT' | 'MULTILINESTRING' | 'MULTIPOLYGON'

export interface GeometryMeta {
  type: Exclude<GeometryType, 'NO_GEOMETRY'>
  srid: number
  dimension: number
}

export type GeoJsonGeometry = {
  type: string
  coordinates: unknown
}

export interface Feature {
  type: 'Feature'
  id: string
  geometry: GeoJsonGeometry | null
  properties: Record<string, unknown>
}

export interface FeatureCollection {
  type: 'FeatureCollection'
  features: Feature[]
}

// geojson shape. good enough: audit and records never send anything else with type+coordinates.
export function isGeometryValue(value: unknown): value is GeoJsonGeometry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const candidate = value as { type?: unknown; coordinates?: unknown; geometries?: unknown }
  return typeof candidate.type === 'string' && ('coordinates' in candidate || 'geometries' in candidate)
}

export function asGeometry(value: unknown): GeoJsonGeometry | null {
  return isGeometryValue(value) ? value : null
}

// only on GEOMETRY fields
export function fieldGeometry(field: FieldMeta): GeometryMeta | null {
  return (field.geometry as GeometryMeta | null | undefined) ?? null
}

// an object definition is an object summary, so this reads both
export function objectGeometry(object: ObjectSummary): GeometryMeta | null {
  return (object.geometry as GeometryMeta | null | undefined) ?? null
}

// keyed by geometry field name, null where the record has none
export function recordGeometries(record: RecordItem): Record<string, GeoJsonGeometry | null> {
  return (record.geometries as Record<string, GeoJsonGeometry | null> | undefined) ?? {}
}

// a MAP component may target one geometry field; null draws every one
export function componentGeometry(component: PageComponent): string | null {
  return typeof component.geometry === 'string' && component.geometry ? component.geometry : null
}
