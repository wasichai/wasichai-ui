import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { coreModule, createLinks, createRegistry, RecordListPage } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { viewsModule } from './module'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

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

  // core's list asks for stored views only while this module is registered (#183): its id is what core looks for
  it('lets core record list offer the stored views', async () => {
    const predio = { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }
    const stored = { id: 'v1', name: 'activos', label: 'Activos', objectName: 'predio', isDefault: true, generated: false }
    fetch = mockFetch([
      { path: '/metadata/objects/predio', body: predio },
      { path: '/objects/predio/views', body: [{ ...stored, definition: { columns: [], filters: {}, sort: null, pageSize: 10 } }] },
      { path: '/objects/predio/records', body: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } }
    ])
    renderWithProviders(<RecordListPage />, { route: '/data/objects/predio/records', path: 'data/objects/:object/records', modules: [viewsModule()] })

    expect(await screen.findByRole('combobox', { name: 'Vista' })).toHaveTextContent('Activos')
    await waitFor(() => expect(fetch?.calls.some((call) => call.path === '/objects/predio/views')).toBe(true))
  })
})
