import type { AuditValueFormatter } from '@wasichai/core'
import { isGeometryValue } from '../types'

// a polygon is thousands of numbers: the log says a shape changed, never prints it
export const geometryAuditFormatter: AuditValueFormatter = { matches: isGeometryValue, labelKey: 'gis:history.geometryUpdated' }

// the audit column that held an object's single shape before shapes became fields
export const GEOMETRY_AUDIT_FIELD_LABELS: Record<string, string> = { geometry: 'gis:history.geometry' }
