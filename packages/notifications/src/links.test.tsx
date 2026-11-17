import { describe, expect, it } from 'vitest'
import { useWasichaiLinks, type WasichaiLinks, type WasichaiModule } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { defaultResolveLink } from './links'
import type { NotificationLinkResolver } from './types'

const caja: WasichaiModule = {
  id: 'caja',
  basePath: 'caja',
  routes: [
    { id: 'cierre', path: 'cierre', component: () => null },
    { id: 'arqueo', path: 'arqueo/:turnoId', component: () => null }
  ]
}

function getLinks(): WasichaiLinks {
  let links!: WasichaiLinks
  const Probe = () => {
    links = useWasichaiLinks()
    return null
  }
  renderWithProviders(<Probe />, { modules: [caja] })
  return links
}

describe('defaultResolveLink', () => {
  const links = getLinks()

  it('opens a record, with and without a tab', () => {
    expect(defaultResolveLink({ type: 'RECORD', object: 'predio', recordId: 'r1' }, links)).toEqual({
      href: '/data/objects/predio/records/r1',
      external: false
    })
    expect(defaultResolveLink({ type: 'RECORD', object: 'predio', recordId: 'r1', tab: 'deuda' }, links)?.href).toBe(
      '/data/objects/predio/records/r1?tab=deuda'
    )
  })

  it('fills path params and sends the rest and the tab to the query string', () => {
    const resolved = defaultResolveLink({ type: 'ROUTE', route: 'caja:arqueo', params: { turnoId: '7', desde: '2026-01-01' }, tab: 'pagos' }, links)
    expect(resolved).toEqual({ href: '/caja/arqueo/7?desde=2026-01-01&tab=pagos', external: false })
    expect(defaultResolveLink({ type: 'ROUTE', route: 'caja:cierre' }, links)).toEqual({ href: '/caja/cierre', external: false })
  })

  it('shows no link for an unknown route', () => {
    expect(defaultResolveLink({ type: 'ROUTE', route: 'nope:nada' }, links)).toBeNull()
  })

  it('shows no link when a path param is missing', () => {
    expect(defaultResolveLink({ type: 'ROUTE', route: 'caja:arqueo' }, links)).toBeNull()
  })

  it('accepts http and https URLs only', () => {
    expect(defaultResolveLink({ type: 'URL', url: 'https://example.org/a?b=1' }, links)).toEqual({ href: 'https://example.org/a?b=1', external: true })
    expect(defaultResolveLink({ type: 'URL', url: 'http://example.org' }, links)?.external).toBe(true)
    expect(defaultResolveLink({ type: 'URL', url: 'javascript:alert(1)' }, links)).toBeNull()
    expect(defaultResolveLink({ type: 'URL', url: 'ftp://example.org/f' }, links)).toBeNull()
    expect(defaultResolveLink({ type: 'URL', url: 'not a url' }, links)).toBeNull()
  })

  it('lets an app resolver answer its own key and delegate the rest', () => {
    const resolver: NotificationLinkResolver = (link, l) =>
      link.type === 'ROUTE' && link.route === 'caja:pagos-sin-entregar'
        ? { href: '/cierre-caja#pagos-sin-entregar', external: false }
        : defaultResolveLink(link, l)
    expect(resolver({ type: 'ROUTE', route: 'caja:pagos-sin-entregar' }, links)).toEqual({ href: '/cierre-caja#pagos-sin-entregar', external: false })
    expect(resolver({ type: 'ROUTE', route: 'caja:cierre' }, links)?.href).toBe('/caja/cierre')
  })
})
