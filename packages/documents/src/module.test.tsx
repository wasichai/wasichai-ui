import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { documentsModule } from './module'

describe('documentsModule', () => {
  it('registers next to core without a conflict', () => {
    expect(() => createRegistry([coreModule, documentsModule()])).not.toThrow()
  })

  it('mounts its routes at the original urls by default', () => {
    const links = createLinks(createRegistry([coreModule, documentsModule()]))
    expect(links.to('documents:types')).toBe('/builder/documents')
    expect(links.to('documents:print', { id: 'document-1' })).toBe('/documents/document-1/print')
  })

  it('moves every route when the app picks another base path', () => {
    const links = createLinks(createRegistry([coreModule, documentsModule({ basePath: 'x' })]))
    expect(links.to('documents:types')).toBe('/x/builder/documents')
    expect(links.to('documents:print', { id: 'document-1' })).toBe('/x/documents/document-1/print')
  })

  it('prints on a bare page: signed in, no app shell around the sheet', () => {
    const registry = createRegistry([coreModule, documentsModule()])
    expect(registry.routes.find((route) => route.key === 'documents:print')?.chrome).toBe('bare')
    expect(registry.routes.find((route) => route.key === 'documents:types')?.chrome).toBe('shell')
  })

  it('offers the types builder in the builder group, after pages and forms', () => {
    const builder = createRegistry([coreModule, documentsModule()]).navGroups.find((group) => group.id === 'builder')
    expect(builder?.items.map((item) => [item.labelKey, item.to])).toEqual([['documents:nav.documents', '/builder/documents']])
  })
})
