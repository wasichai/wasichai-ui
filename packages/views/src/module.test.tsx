import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { viewsModule } from './module'

describe('viewsModule', () => {
  it('registers next to core without a conflict', () => {
    expect(() => createRegistry([coreModule, viewsModule()])).not.toThrow()
  })

  it('mounts its route under the default base path', () => {
    const links = createLinks(createRegistry([coreModule, viewsModule()]))
    expect(links.to('views:builder')).toBe('/builder/views')
  })

  it('moves every route when the app picks another base path', () => {
    const links = createLinks(createRegistry([coreModule, viewsModule({ basePath: 'x' })]))
    expect(links.to('views:builder')).toBe('/x/views')
  })

  it('puts its entry in core builder group, after pages and forms', () => {
    const builder = createRegistry([coreModule, viewsModule()]).navGroups.find((group) => group.id === 'builder')
    expect(builder?.items).toEqual([expect.objectContaining({ labelKey: 'views:nav.views', to: '/builder/views', order: 40 })])
  })
})
