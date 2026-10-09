import { render } from '@testing-library/react'
import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { useMapDefaults, type MapDefaults } from './components/MapDefaults'
import { gisModule } from './module'

// what a MapView under the module's provider reads
function defaultsUnder(module: ReturnType<typeof gisModule>): MapDefaults {
  let seen: MapDefaults | undefined
  function Probe() {
    seen = useMapDefaults()
    return null
  }
  const [Provider] = module.providers!
  render(
    <Provider>
      <Probe />
    </Provider>
  )
  return seen!
}

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

  it('hands its map defaults to the app through one provider', () => {
    const basemap = { type: 'none' } as const
    const initialView = { center: [-71.54, -16.41] as [number, number], zoom: 13 }
    expect(gisModule({ basemap, initialView }).providers).toHaveLength(1)
    expect(defaultsUnder(gisModule({ basemap, initialView }))).toEqual({ basemap, initialView })
  })

  it('leaves every map on its built-in default without options', () => {
    expect(defaultsUnder(gisModule())).toEqual({ basemap: undefined, initialView: undefined })
  })
})
