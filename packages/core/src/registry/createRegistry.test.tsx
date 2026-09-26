import { describe, expect, it } from 'vitest'
import { createRegistry, RegistryError } from './createRegistry'
import type { WasichaiModule, FieldRenderer } from './contract'

const Page = () => <div />
const Input = () => <div />
const renderer: FieldRenderer = { section: 'sketches', input: Input }

// shared by the nav tests below: one group 'g', extended per test
const grouped = (extra: Partial<WasichaiModule>): WasichaiModule => ({ id: 'a', navGroups: [{ id: 'g', labelKey: 'g', order: 1 }], ...extra })

describe('createRegistry', () => {
  it('mounts module routes under the module base path, keyed by module id', () => {
    const registry = createRegistry([{ id: 'gis', basePath: '/gis/', routes: [{ id: 'map', path: 'map', component: Page }] }])
    expect(registry.routes).toEqual([{ key: 'gis:map', moduleId: 'gis', path: '/gis/map', chrome: 'shell', Component: Page }])
  })

  it('gives a lazy route a component the router can mount', () => {
    const registry = createRegistry([{ id: 'gis', routes: [{ id: 'map', path: 'map', lazy: async () => ({ default: Page }) }] }])
    expect(registry.routes[0].Component).toBeTruthy()
    expect(registry.routes[0].path).toBe('/map')
  })

  it('refuses a route with both or neither of component and lazy', () => {
    expect(() => createRegistry([{ id: 'a', routes: [{ id: 'x', path: 'x' }] }])).toThrow(/exactly one of component or lazy/)
    expect(() => createRegistry([{ id: 'a', routes: [{ id: 'x', path: 'x', component: Page, lazy: async () => ({ default: Page }) }] }])).toThrow(RegistryError)
  })

  it('refuses a module id twice, a reserved id and a malformed id', () => {
    expect(() => createRegistry([{ id: 'gis' }, { id: 'gis' }])).toThrow(/'gis' is registered twice/)
    expect(() => createRegistry([{ id: 'common' }])).toThrow(/reserved/)
    expect(() => createRegistry([{ id: 'Gis' }])).toThrow(/must match/)
  })

  it('refuses two modules claiming one field type, naming both', () => {
    const a: WasichaiModule = { id: 'a', fieldRenderers: { SKETCH: renderer } }
    const b: WasichaiModule = { id: 'b', fieldRenderers: { SKETCH: renderer } }
    expect(() => createRegistry([a, b])).toThrow(/field type 'SKETCH' is claimed by both 'a' and 'b'/)
  })

  it('refuses a module claiming a core type', () => {
    expect(() => createRegistry([{ id: 'a', fieldRenderers: { TEXT: renderer } }])).toThrow(/cannot claim core field type 'TEXT'/)
    expect(() => createRegistry([{ id: 'a', pageComponents: { FORM: { render: Page, labelKey: 'x' } } }])).toThrow(/core page component 'FORM'/)
    expect(() => createRegistry([{ id: 'a', pageActions: { NAVIGATE: { render: Page, labelKey: 'x' } } }])).toThrow(/core page action 'NAVIGATE'/)
    expect(() => createRegistry([{ id: 'a', historyRenderers: { UPDATE: { body: Page, labelKey: 'x' } } }])).toThrow(/core history operation 'UPDATE'/)
  })

  it('refuses two routes on one path and one route id twice', () => {
    const one: WasichaiModule = { id: 'a', routes: [{ id: 'x', path: 'data/x', component: Page }] }
    const two: WasichaiModule = { id: 'b', routes: [{ id: 'y', path: '/data/x/', component: Page }] }
    expect(() => createRegistry([one, two])).toThrow(/'a:x' and 'b:y' both use path '\/data\/x'/)
    expect(() =>
      createRegistry([
        {
          id: 'a',
          routes: [
            { id: 'x', path: 'x', component: Page },
            { id: 'x', path: 'y', component: Page }
          ]
        }
      ])
    ).toThrow(/route 'a:x' is declared twice/)
  })

  it('treats differently named params as the same path shape', () => {
    const one: WasichaiModule = { id: 'a', routes: [{ id: 'x', path: 'data/:id', component: Page }] }
    const two: WasichaiModule = { id: 'b', routes: [{ id: 'y', path: 'data/:key', component: Page }] }
    expect(() => createRegistry([one, two])).toThrow(/'a:x' and 'b:y' both use path '\/data\/:id'/)
  })

  it('refuses optional segments and splats', () => {
    expect(() => createRegistry([{ id: 'a', routes: [{ id: 'x', path: 'x/:id?', component: Page }] }])).toThrow(/optional segment ':id\?' is not supported/)
    expect(() => createRegistry([{ id: 'a', routes: [{ id: 'x', path: 'x/*', component: Page }] }])).toThrow(/splat segment '\*' is not supported/)
  })

  it('builds nav groups in order, items in order, and resolves routes to paths', () => {
    const core: WasichaiModule = {
      id: 'core',
      routes: [{ id: 'objects', path: 'data/objects', component: Page }],
      navGroups: [
        { id: 'administration', labelKey: 'nav.administration', order: 50 },
        { id: 'data', labelKey: 'nav.data', order: 10 }
      ],
      nav: [
        { group: 'data', labelKey: 'nav.records', order: 20 },
        { group: 'data', labelKey: 'nav.objects', order: 10, route: 'objects' }
      ]
    }
    const gis: WasichaiModule = {
      id: 'gis',
      basePath: 'gis',
      routes: [{ id: 'map', path: 'map', component: Page }],
      navGroups: [{ id: 'gis', labelKey: 'gis:nav.gis', order: 20 }],
      nav: [{ group: 'gis', labelKey: 'gis:nav.maps', order: 10, route: 'map' }]
    }

    const groups = createRegistry([core, gis]).navGroups
    expect(groups.map((group) => group.id)).toEqual(['data', 'gis', 'administration'])
    expect(groups[0].items.map((item) => [item.labelKey, item.to, item.disabled])).toEqual([
      ['nav.objects', '/data/objects', false],
      ['nav.records', null, true]
    ])
    expect(groups[1].items[0].to).toBe('/gis/map')
  })

  it('lets a module put an entry in a group another module declared', () => {
    const core: WasichaiModule = { id: 'core', navGroups: [{ id: 'builder', labelKey: 'nav.builder', order: 30 }] }
    const pages: WasichaiModule = {
      id: 'pages',
      routes: [{ id: 'builder', path: 'builder/pages', component: Page }],
      nav: [{ group: 'builder', labelKey: 'pages:nav.pages', order: 10, route: 'builder' }]
    }
    expect(createRegistry([core, pages]).navGroups[0].items[0].to).toBe('/builder/pages')
  })

  it('refuses nav into a missing group, at a missing route, or at a route with parameters', () => {
    expect(() => createRegistry([{ id: 'a', nav: [{ group: 'nope', labelKey: 'x', order: 1 }] }])).toThrow(/unknown nav group 'nope'/)
    expect(() => createRegistry([grouped({ nav: [{ group: 'g', labelKey: 'x', order: 1, route: 'core:ghost' }] })])).toThrow(/unknown route 'core:ghost'/)
    expect(() =>
      createRegistry([grouped({ routes: [{ id: 'r', path: 'r/:id', component: Page }], nav: [{ group: 'g', labelKey: 'x', order: 1, route: 'r' }] })])
    ).toThrow(/needs parameters/)
    expect(() => createRegistry([grouped({}), { id: 'b', navGroups: [{ id: 'g', labelKey: 'g', order: 2 }] }])).toThrow(
      /nav group 'g' is declared by both 'a' and 'b'/
    )
  })

  it('refuses a nav item declared twice', () => {
    expect(() =>
      createRegistry([
        grouped({
          nav: [
            { group: 'g', labelKey: 'x', order: 1 },
            { group: 'g', labelKey: 'x', order: 2 }
          ]
        })
      ])
    ).toThrow(/nav item 'a:x' is declared twice/)
  })

  it('refuses disabled: false without a route', () => {
    expect(() => createRegistry([grouped({ nav: [{ group: 'g', labelKey: 'x', order: 1, disabled: false }] })])).toThrow(
      /nav item 'a:x' is disabled: false without a route/
    )
  })

  it('collects the list slots in module order and merges audit field labels', () => {
    const PanelA = () => <div />
    const PanelB = () => <div />
    const registry = createRegistry([
      { id: 'a', recordPanels: [PanelA], auditFieldLabels: { geom: 'a:history.geom' }, recordQueryKeys: (object) => [['a', object]] },
      { id: 'b', recordPanels: [PanelB], auditFieldLabels: { other: 'b:x' } }
    ])
    expect(registry.recordPanels).toEqual([PanelA, PanelB])
    expect(registry.auditFieldLabels).toEqual({ geom: 'a:history.geom', other: 'b:x' })
    expect(registry.recordQueryKeys.map((keysOf) => keysOf('predio'))).toEqual([[['a', 'predio']]])
  })

  it('refuses two modules claiming the same audit field label, naming both', () => {
    const a: WasichaiModule = { id: 'a', auditFieldLabels: { geom: 'a:history.geom' } }
    const b: WasichaiModule = { id: 'b', auditFieldLabels: { geom: 'b:history.geom' } }
    expect(() => createRegistry([a, b])).toThrow(/audit field label 'geom' is claimed by both 'a' and 'b'/)
  })

  it('refuses a field renderer section that collides with a core record key', () => {
    expect(() => createRegistry([{ id: 'a', fieldRenderers: { SKETCH: { ...renderer, section: 'attributes' } } }])).toThrow(
      /field type 'SKETCH' of module 'a' cannot use section 'attributes': it collides with a core record key/
    )
    expect(() => createRegistry([{ id: 'a', fieldRenderers: { SKETCH: { ...renderer, section: 'state' } } }])).toThrow(RegistryError)
    expect(() => createRegistry([{ id: 'a', fieldRenderers: { SKETCH: { ...renderer, section: 'id' } } }])).toThrow(RegistryError)
    expect(() => createRegistry([{ id: 'a', fieldRenderers: { SKETCH: { ...renderer, section: 'createdAt' } } }])).toThrow(RegistryError)
    expect(() => createRegistry([{ id: 'a', fieldRenderers: { SKETCH: { ...renderer, section: 'updatedAt' } } }])).toThrow(RegistryError)
  })

  it('accepts a field renderer section that is not a core record key', () => {
    expect(() => createRegistry([{ id: 'a', fieldRenderers: { SKETCH: renderer } }])).not.toThrow()
  })

  it('refuses two modules whose field renderer settings share a defaults key, naming both', () => {
    const settings = { defaults: { strokeWidth: '2' }, editor: Input, toPayload: (values: Record<string, string>) => values }
    const a: WasichaiModule = { id: 'a', fieldRenderers: { SKETCH: { ...renderer, settings } } }
    const b: WasichaiModule = { id: 'b', fieldRenderers: { LINE: { ...renderer, settings } } }
    expect(() => createRegistry([a, b])).toThrow(/field renderer setting 'strokeWidth' is claimed by both 'a' and 'b'/)
  })

  it('builds a page component definition with a label for the pages builder', () => {
    const Settings = () => <div />
    const registry = createRegistry([{ id: 'gis', pageComponents: { MAP: { render: Page, labelKey: 'gis:pages.map', settings: Settings } } }])
    expect(registry.pageComponents.MAP).toEqual({ render: Page, labelKey: 'gis:pages.map', settings: Settings })
  })

  it('carries a page component definition through its optional preview and defaults', () => {
    const Preview = () => <div />
    const registry = createRegistry([
      { id: 'gis', pageComponents: { MAP: { render: Page, labelKey: 'gis:pages.map', preview: Preview, defaults: { geometry: null } } } }
    ])
    expect(registry.pageComponents.MAP.preview).toBe(Preview)
    expect(registry.pageComponents.MAP.defaults).toEqual({ geometry: null })
  })

  it('builds a page action definition with a label, settings and defaults for the pages builder', () => {
    const Settings = () => <div />
    const registry = createRegistry([
      {
        id: 'workflow',
        pageActions: { TRANSITION: { render: Page, labelKey: 'workflow:pages.transition', settings: Settings, defaults: { style: 'SECONDARY' } } }
      }
    ])
    expect(registry.pageActions.TRANSITION).toEqual({
      render: Page,
      labelKey: 'workflow:pages.transition',
      settings: Settings,
      defaults: { style: 'SECONDARY' }
    })
  })

  it('refuses two modules claiming one page action kind, naming both', () => {
    const a: WasichaiModule = { id: 'a', pageActions: { TRANSITION: { render: Page, labelKey: 'a:x' } } }
    const b: WasichaiModule = { id: 'b', pageActions: { TRANSITION: { render: Page, labelKey: 'b:x' } } }
    expect(() => createRegistry([a, b])).toThrow(/page action 'TRANSITION' is claimed by both 'a' and 'b'/)
  })

  it('builds a history renderer with a label and tone for the timeline', () => {
    const Body = () => <div />
    const registry = createRegistry([{ id: 'documents', historyRenderers: { ISSUE: { body: Body, labelKey: 'documents:operations.ISSUE', tone: 'info' } } }])
    expect(registry.historyRenderers.ISSUE).toEqual({ body: Body, labelKey: 'documents:operations.ISSUE', tone: 'info' })
  })
})
