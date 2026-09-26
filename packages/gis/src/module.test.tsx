import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { gisModule } from './module'

describe('gisModule', () => {
  it('registers next to core without a conflict', () => {
    expect(() => createRegistry([coreModule, gisModule()])).not.toThrow()
  })

  it('mounts its routes under the default base path', () => {
    const links = createLinks(createRegistry([coreModule, gisModule()]))
    expect(links.to('gis:map')).toBe('/gis/map')
    expect(links.to('gis:layers')).toBe('/gis/layers')
  })

  it('moves every route when the app picks another base path', () => {
    const links = createLinks(createRegistry([coreModule, gisModule({ basePath: 'x' })]))
    expect(links.to('gis:map')).toBe('/x/map')
    expect(links.to('gis:layers')).toBe('/x/layers')
  })

  it('puts maps and layers in its own sidebar group, map views as a placeholder', () => {
    const registry = createRegistry([coreModule, gisModule()])
    const group = registry.navGroups.find((candidate) => candidate.id === 'gis')!
    expect(group.labelKey).toBe('gis:nav.gis')
    expect(group.items.map((item) => [item.labelKey, item.to, item.disabled])).toEqual([
      ['gis:nav.maps', '/gis/map', false],
      ['gis:nav.layers', '/gis/layers', false],
      ['gis:nav.mapViews', null, true]
    ])
  })

  it('keeps shapes out of attributes and out of the unique toggle', () => {
    const renderer = gisModule().fieldRenderers!.GEOMETRY
    expect(renderer.section).toBe('geometries')
    expect(renderer.uniqueAllowed).toBe(false)
  })

  it('marks the features cache stale when a record of the object changes', () => {
    expect(gisModule().recordQueryKeys!('predio')).toEqual([['features', 'predio']])
  })

  it('builds a fresh module on every call', () => {
    expect(gisModule()).not.toBe(gisModule())
    expect(gisModule().fieldRenderers!.GEOMETRY.settings!.defaults).not.toBe(gisModule().fieldRenderers!.GEOMETRY.settings!.defaults)
  })
})
