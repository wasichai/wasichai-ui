import { describe, expect, it } from 'vitest'
import { createRegistry } from '../registry/createRegistry'
import { createLinks, CORE_ROUTE_PATHS } from './links'
import { fillPath, joinPath } from './paths'

const Page = () => null
const links = createLinks(createRegistry([{ id: 'gis', basePath: 'gis', routes: [{ id: 'map', path: 'map', component: Page }] }]))

describe('core links', () => {
  it('builds the same urls the original app hardcoded', () => {
    expect(links.home()).toBe('/')
    expect(links.login()).toBe('/login')
    expect(links.objects()).toBe('/data/objects')
    expect(links.newObject()).toBe('/data/objects/new')
    expect(links.editObject('predio')).toBe('/data/objects/predio/edit')
    expect(links.relationships()).toBe('/data/relationships')
    expect(links.records('predio')).toBe('/data/objects/predio/records')
    expect(links.newRecord('predio')).toBe('/data/objects/predio/records/new')
    expect(links.record('predio', 'r1')).toBe('/data/objects/predio/records/r1')
  })

  it('percent-encodes parameters instead of letting them break the path', () => {
    expect(links.record('predio', 'a/b?c')).toBe('/data/objects/predio/records/a%2Fb%3Fc')
  })

  it('refuses a missing parameter instead of linking to undefined', () => {
    expect(() => links.records('')).toThrow(/needs :object/)
  })

  it('keeps every core path in one table', () => {
    expect(CORE_ROUTE_PATHS.records).toBe('data/objects/:object/records')
  })

  it('builds the admin urls', () => {
    expect(links.users()).toBe('/admin/users')
    expect(links.roles()).toBe('/admin/roles')
    expect(links.permissions()).toBe('/admin/permissions')
    expect(links.audit()).toBe('/admin/audit')
  })
})

describe('module links', () => {
  it('builds a registered route with a query string', () => {
    expect(links.to('gis:map', {}, { object: 'predio' })).toBe('/gis/map?object=predio')
    expect(links.has('gis:map')).toBe(true)
  })

  it('says so when a route is not registered', () => {
    expect(links.has('documents:print')).toBe(false)
    expect(() => links.to('documents:print', { id: '1' })).toThrow(/no route 'documents:print'/)
  })
})

describe('paths', () => {
  it('joins parts with single slashes and always starts at the root', () => {
    expect(joinPath('', '')).toBe('/')
    expect(joinPath('/gis/', '/map')).toBe('/gis/map')
  })

  it('fills named segments only', () => {
    expect(fillPath('/a/:x/b', { x: '1' })).toBe('/a/1/b')
  })
})
