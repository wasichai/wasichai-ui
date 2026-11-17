import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { notificationsModule } from '../module'
import type { InboxItem } from '../types'
import { InboxPage } from './InboxPage'

interface Call {
  method: string
  path: string
  body: unknown
}

let calls: Call[]
let items: InboxItem[]
let snoozeAnswer: { status: number; body?: unknown }
let readAllAnswer: { status: number; body?: unknown }
let streamStatus: number
let listStatus: number

function item(over: Partial<InboxItem> & { id: string }): InboxItem {
  return {
    kind: 'INFO',
    title: `Título ${over.id}`,
    body: null,
    link: null,
    publishAt: '2026-11-17T10:00:00Z',
    expiresAt: null,
    dueAt: null,
    overdue: false,
    source: 'manual',
    read: false,
    snoozedUntil: null,
    dismissible: true,
    ...over
  }
}

beforeEach(() => {
  calls = []
  items = []
  snoozeAnswer = { status: 204 }
  readAllAnswer = { status: 204 }
  // a refused stream with a retry reads as polling: the module is there
  streamStatus = 500
  listStatus = 200
  localStorage.setItem('wasichai-test.token', 'tok')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '')
      const method = (init.method ?? 'GET').toUpperCase()
      if (path === '/auth/me/notifications/stream') return new Response(null, { status: streamStatus })
      calls.push({ method, path, body: typeof init.body === 'string' ? JSON.parse(init.body) : null })
      if (method === 'GET' && listStatus !== 200)
        return new Response(JSON.stringify({ title: 'x' }), { status: listStatus, headers: { 'Content-Type': 'application/problem+json' } })
      if (method === 'GET') {
        const kind = new URLSearchParams(path.split('?')[1]).get('kind')
        const content = items.filter((i) => !kind || i.kind === kind)
        return new Response(JSON.stringify({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      if (path.endsWith('/snooze') && snoozeAnswer.status !== 204) {
        return new Response(JSON.stringify(snoozeAnswer.body), { status: snoozeAnswer.status, headers: { 'Content-Type': 'application/problem+json' } })
      }
      if (path.endsWith('/read-all') && readAllAnswer.status !== 204) {
        return new Response(JSON.stringify(readAllAnswer.body), { status: readAllAnswer.status, headers: { 'Content-Type': 'application/problem+json' } })
      }
      return new Response(null, { status: 204 })
    })
  )
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  localStorage.clear()
})

const render = (route = '/') => renderWithProviders(<InboxPage />, { modules: [notificationsModule()], route })
function Search() {
  return <span data-testid="search">{useLocation().search}</span>
}
const listCalls = () => calls.filter((c) => c.method === 'GET')

describe('InboxPage', () => {
  it.each([404, 403])('shows a neutral empty page, no error and no retry, when the list answers %i', async (status) => {
    listStatus = status
    render()
    expect(await screen.findByText('No hay alertas aquí')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: /reintentar|retry/i })).toBeNull()
  })

  it('shows a neutral empty page when the module is unavailable', async () => {
    streamStatus = 404
    items = [item({ id: 'a' })]
    render()
    expect(await screen.findByText('No hay alertas aquí')).toBeInTheDocument()
    expect(screen.queryByText('Título a')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('still shows the error for other failures', async () => {
    listStatus = 500
    render()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('does not keep an old error after a later action succeeds', async () => {
    items = [item({ id: 'a' })]
    snoozeAnswer = { status: 400, body: { title: 'Bad Request', detail: 'until is too far ahead' } }
    render()
    const card = (await screen.findByText('Título a')).closest('article') as HTMLElement
    await userEvent.click(within(card).getByRole('button', { name: 'Posponer' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Una semana' }))
    expect(await within(card).findByRole('alert')).toHaveTextContent('until is too far ahead')
    await userEvent.click(within(card).getByRole('button', { name: 'Marcar como leída' }))
    await waitFor(() => expect(within(card).queryByRole('alert')).toBeNull())
  })

  it('shows the tabs and filters the list by kind', async () => {
    items = [item({ id: 'a', kind: 'INFO' }), item({ id: 'b', kind: 'WARNING' })]
    render()
    expect(await screen.findByText('Título a')).toBeInTheDocument()
    expect(listCalls().at(-1)?.path).toContain('kind=INFO')

    await userEvent.click(screen.getByRole('tab', { name: /Advertencias/ }))
    expect(await screen.findByText('Título b')).toBeInTheDocument()
    expect(screen.queryByText('Título a')).not.toBeInTheDocument()
    expect(listCalls().at(-1)?.path).toContain('kind=WARNING')
  })

  it('opens Pendientes from ?tab=ACTION, with due date and overdue badge', async () => {
    items = [item({ id: 'x', kind: 'ACTION', dueAt: '2026-11-10T05:00:00Z', overdue: true })]
    render('/?tab=ACTION')
    expect(await screen.findByText('Título x')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Pendientes/ })).toHaveAttribute('aria-selected', 'true')
    expect(listCalls().at(-1)?.path).toContain('kind=ACTION')
    expect(screen.getByText('Vencida')).toBeInTheDocument()
  })

  it('hides dismiss when the item is not dismissible', async () => {
    items = [item({ id: 'a', dismissible: true }), item({ id: 'b', dismissible: false })]
    render()
    const first = (await screen.findByText('Título a')).closest('article') as HTMLElement
    const second = screen.getByText('Título b').closest('article') as HTMLElement
    expect(within(first).getByRole('button', { name: 'Descartar' })).toBeInTheDocument()
    expect(within(second).queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument()

    await userEvent.click(within(first).getByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', path: '/auth/me/notifications/a/dismiss', body: null }))
  })

  it('snoozes until the chosen instant', async () => {
    items = [item({ id: 'a' })]
    render()
    const card = (await screen.findByText('Título a')).closest('article') as HTMLElement
    const before = Date.now()
    await userEvent.click(within(card).getByRole('button', { name: 'Posponer' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Una hora' }))
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/a/snooze'))).toBe(true))
    const until = Date.parse((calls.find((c) => c.path.endsWith('/a/snooze'))?.body as { until: string }).until)
    expect(until - before).toBeGreaterThan(3_590_000)
    expect(until - before).toBeLessThan(3_620_000)
  })

  it('shows the 400 the server answers beyond the snooze limit', async () => {
    items = [item({ id: 'a' })]
    snoozeAnswer = { status: 400, body: { title: 'Bad Request', detail: 'until is too far ahead' } }
    render()
    const card = (await screen.findByText('Título a')).closest('article') as HTMLElement
    await userEvent.click(within(card).getByRole('button', { name: 'Posponer' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Una semana' }))
    expect(await within(card).findByRole('alert')).toHaveTextContent('until is too far ahead')
  })

  it('marks every item of the tab as read, sending its kind', async () => {
    items = [item({ id: 'a', kind: 'WARNING' })]
    render('/?tab=WARNING')
    await screen.findByText('Título a')
    await userEvent.click(screen.getByRole('button', { name: 'Marcar todo como leído' }))
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', path: '/auth/me/notifications/read-all', body: { kind: 'WARNING' } }))
  })

  it('asks for the state chosen in the filter', async () => {
    items = [item({ id: 'a' })]
    render()
    await screen.findByText('Título a')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), 'snoozed')
    await waitFor(() => expect(listCalls().at(-1)?.path).toContain('state=snoozed'))
  })

  it('prints a body with markup as characters', async () => {
    items = [item({ id: 'a', body: 'Hola <b>mundo</b>' })]
    const { container } = render()
    expect(await screen.findByText('Hola <b>mundo</b>')).toBeInTheDocument()
    expect(container.querySelector('b')).toBeNull()
  })

  it('moves between tabs with the arrow keys, Home and End', async () => {
    render()
    const info = await screen.findByRole('tab', { name: /Comunicados/ })
    info.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Advertencias/ })).toHaveFocus()
    expect(screen.getByRole('tab', { name: /Advertencias/ })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: /Pendientes/ })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Comunicados/ })).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: /Pendientes/ })).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: /Comunicados/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('links tabs and panel for assistive tech', async () => {
    render('/?tab=WARNING')
    const tab = await screen.findByRole('tab', { name: /Advertencias/ })
    const panel = screen.getByRole('tabpanel')
    expect(tab.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', tab.id)
  })

  it('shows why "mark all as read" failed', async () => {
    items = [item({ id: 'a' })]
    readAllAnswer = { status: 500, body: { title: 'Server Error', detail: 'read-all broke' } }
    render()
    await screen.findByText('Título a')
    await userEvent.click(screen.getByRole('button', { name: 'Marcar todo como leído' }))
    expect(await screen.findByText(/read-all broke/)).toBeInTheDocument()
    expect(screen.getAllByRole('alert').some((el) => el.textContent?.includes('read-all broke'))).toBe(true)
  })

  it("keeps the host app's other query params when the tab changes", async () => {
    renderWithProviders(
      <>
        <InboxPage />
        <Search />
      </>,
      { modules: [notificationsModule()], route: '/?foo=bar' }
    )
    await userEvent.click(await screen.findByRole('tab', { name: /Pendientes/ }))
    expect(screen.getByTestId('search')).toHaveTextContent('foo=bar')
    expect(screen.getByTestId('search')).toHaveTextContent('tab=ACTION')
  })
})
