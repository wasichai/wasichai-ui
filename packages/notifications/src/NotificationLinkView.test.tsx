import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { NotificationLinkView } from './NotificationLinkView'
import { notificationsModule } from './module'
import type { NotificationLinkResolver } from './types'

let reads: string[]

beforeEach(() => {
  reads = []
  localStorage.setItem('wasichai-test.token', 'tok')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '')
      if (path === '/auth/me/notifications/stream') return new Response(null, { status: 404 })
      if ((init.method ?? 'GET') === 'POST' && path.endsWith('/read')) reads.push(path)
      return new Response(null, { status: 204 })
    })
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function view(link: Parameters<typeof NotificationLinkView>[0]['link'], resolveLink?: NotificationLinkResolver) {
  return renderWithProviders(
    <NotificationLinkView id="n1" link={link}>
      Pagos
    </NotificationLinkView>,
    { modules: [notificationsModule({ resolveLink })] }
  )
}

describe('NotificationLinkView', () => {
  it('draws an internal link and marks the notification read on click', async () => {
    view({ type: 'RECORD', object: 'predio', recordId: 'r1' })
    const anchor = screen.getByRole('link', { name: 'Pagos' })
    expect(anchor).toHaveAttribute('href', '/data/objects/predio/records/r1')
    expect(anchor).not.toHaveAttribute('target')
    await userEvent.click(anchor)
    await waitFor(() => expect(reads).toHaveLength(1))
    expect(reads[0]).toContain('/n1/')
  })

  it('opens an external URL in a new tab without opener', () => {
    view({ type: 'URL', url: 'https://example.org/doc.pdf' })
    const anchor = screen.getByRole('link', { name: 'Pagos' })
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it("prefers the app's resolver", () => {
    view({ type: 'ROUTE', route: 'caja:pagos-sin-entregar' }, () => ({ href: '/cierre-caja#pagos-sin-entregar', external: false }))
    expect(screen.getByRole('link', { name: 'Pagos' })).toHaveAttribute('href', '/cierre-caja#pagos-sin-entregar')
  })

  it('shows plain text when the link leads nowhere', () => {
    view({ type: 'URL', url: 'javascript:alert(1)' })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Pagos')).toBeInTheDocument()
  })

  it('falls back to plain text when the resolver throws', () => {
    view({ type: 'RECORD', object: 'predio', recordId: 'r1' }, () => {
      throw new Error('boom')
    })
    expect(screen.getByText('Pagos')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
