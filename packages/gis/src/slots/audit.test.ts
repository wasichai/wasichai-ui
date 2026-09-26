import { describe, expect, it } from 'vitest'
import { createWasichaiI18n, formatAuditValue } from '@wasichai/core'
import { gisModule } from '../module'
import { polygon } from '../test/fixtures'
import { geometryAuditFormatter } from './audit'

describe('gis in the audit log', () => {
  it('recognises geojson, and nothing that merely has a type', () => {
    expect(geometryAuditFormatter.matches(polygon)).toBe(true)
    expect(geometryAuditFormatter.matches({ type: 'GeometryCollection', geometries: [] })).toBe(true)
    expect(geometryAuditFormatter.matches({ type: 'Polygon' })).toBe(false)
    expect(geometryAuditFormatter.matches([1, 2])).toBe(false)
    expect(geometryAuditFormatter.matches('Polygon')).toBe(false)
  })

  it('names a shape change in words and labels the geometry column, never dumping coordinates', () => {
    const module = gisModule()
    const i18n = createWasichaiI18n({ languages: ['es', 'en'], storageKey: 'gis-audit-test.lang', modules: [module] })
    expect(i18n.t(geometryAuditFormatter.labelKey)).toBe('geometría actualizada')
    expect(i18n.t(module.auditFieldLabels!.geometry)).toBe('Geometría')
    expect(formatAuditValue(polygon, { valueFormatters: module.auditValueFormatters!, fieldLabels: module.auditFieldLabels! })).toBe('geometría actualizada')
  })
})
