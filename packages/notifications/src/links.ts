import type { WasichaiLinks } from '@wasichai/core'
import type { NotificationHref, NotificationLink } from './types'

function withTab(href: string, tab?: string | null): string {
  if (!tab) return href
  return `${href}${href.includes('?') ? '&' : '?'}${new URLSearchParams({ tab })}`
}

// core's links for each kind. null = this app cannot open it
export function defaultResolveLink(link: NotificationLink, links: WasichaiLinks): NotificationHref | null {
  switch (link.type) {
    case 'RECORD':
      return { href: withTab(links.record(link.object, link.recordId), link.tab), external: false }
    case 'ROUTE': {
      if (!links.has(link.route)) return null
      const names = links.routeParams(link.route)
      const params = link.params ?? {}
      // a path param the notification did not bring would leave a literal ':name' in the href
      if (names.some((name) => !params[name])) return null
      const path: Record<string, string> = {}
      const search: Record<string, string> = {}
      for (const [key, value] of Object.entries(params)) (names.includes(key) ? path : search)[key] = value
      if (link.tab) search.tab = link.tab
      return { href: links.to(link.route, path, search), external: false }
    }
    case 'URL': {
      // only web pages: javascript: and friends never become an href
      try {
        const { protocol } = new URL(link.url)
        return protocol === 'http:' || protocol === 'https:' ? { href: link.url, external: true } : null
      } catch {
        return null
      }
    }
  }
}
