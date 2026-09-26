import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { pagesModule } from './module'

describe('pagesModule', () => {
  it('registers next to core without a conflict', () => {
    expect(() => createRegistry([coreModule, pagesModule()])).not.toThrow()
  })

  it('mounts its routes under the default base path', () => {
    const links = createLinks(createRegistry([coreModule, pagesModule()]))
    expect(links.to('pages:builder')).toBe('/builder/pages')
  })

  it('moves every route when the app picks another base path', () => {
    const links = createLinks(createRegistry([coreModule, pagesModule({ basePath: 'x' })]))
    expect(links.to('pages:builder')).toBe('/x/pages')
  })

  it('puts its entry first in the builder group', () => {
    const builder = createRegistry([coreModule, pagesModule()]).navGroups.find((group) => group.id === 'builder')
    expect(builder?.items[0]).toMatchObject({ labelKey: 'pages:nav.pages', to: '/builder/pages' })
  })
})
