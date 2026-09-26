import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { formsModule } from './module'

describe('formsModule', () => {
  it('registers next to core without a conflict', () => {
    expect(() => createRegistry([coreModule, formsModule()])).not.toThrow()
  })

  it('mounts its route under the default base path', () => {
    const links = createLinks(createRegistry([coreModule, formsModule()]))
    expect(links.to('forms:builder')).toBe('/builder/forms')
  })

  it('moves every route when the app picks another base path', () => {
    const links = createLinks(createRegistry([coreModule, formsModule({ basePath: 'x' })]))
    expect(links.to('forms:builder')).toBe('/x/forms')
  })

  it('puts its entry in core builder group, second after pages', () => {
    const builder = createRegistry([coreModule, formsModule()]).navGroups.find((group) => group.id === 'builder')
    expect(builder?.items).toEqual([expect.objectContaining({ labelKey: 'forms:nav.forms', to: '/builder/forms', order: 20 })])
  })
})
