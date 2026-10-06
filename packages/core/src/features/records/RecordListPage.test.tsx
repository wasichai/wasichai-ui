import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import type { WasichaiModule } from '../../registry/contract'
import { Link } from 'react-router'
import { RecordListPage } from './RecordListPage'

let fetch: FetchMock | null = null
afterEach(() => {
  fetch?.restore()
  vi.restoreAllMocks()
})

const mapButton: WasichaiModule = {
  id: 'maps',
  recordListActions: [({ objectName, definition }) => <button>{`mapa ${objectName} ${definition.label}`}</button>]
}

describe('RecordListPage', () => {
  it('lists on the fallback view, links the new record, and lets modules add header buttons', async () => {
    fetch = mockFetch([
      {
        path: '/metadata/objects/predio',
        body: { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }
      },
      { path: '/objects/predio/views', status: 404, body: { title: 'Not Found' } },
      { path: '/objects/predio/records', body: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } }
    ])
    renderWithProviders(<RecordListPage />, { route: '/data/objects/predio/records', path: 'data/objects/:object/records', modules: [mapButton] })

    expect(await screen.findByRole('button', { name: 'mapa predio Predio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Nuevo registro/ })).toHaveAttribute('href', '/data/objects/predio/records/new')
  })

  // an append-only record pointing at it (ADR-031 D24), no permission: the delete used to fail in silence
  it('says why a delete was refused', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fetch = mockFetch([
      {
        path: '/metadata/objects/predio',
        body: { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }
      },
      { path: '/objects/predio/views', status: 404, body: { title: 'Not Found' } },
      {
        path: '/objects/predio/records',
        body: { content: [{ id: 'r1', createdAt: null, updatedAt: null, attributes: {} }], page: 0, size: 20, totalElements: 1, totalPages: 1 }
      },
      { method: 'DELETE', path: '/objects/predio/records/r1', status: 409, body: { title: 'Conflict', detail: 'Un registro de solo anexado apunta a este' } }
    ])
    renderWithProviders(<RecordListPage />, { route: '/data/objects/predio/records', path: 'data/objects/:object/records' })

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Un registro de solo anexado apunta a este')
  })

  // the page stays mounted from one list to the next: a refusal belongs to the list it happened on
  it('leaves a refusal behind on the list it happened on', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const definition = (name: string) => ({ id: name, name, label: name, pluralLabel: name, description: null, enabled: true, fields: [] })
    const one = { content: [{ id: 'r1', createdAt: null, updatedAt: null, attributes: {} }], page: 0, size: 20, totalElements: 1, totalPages: 1 }
    fetch = mockFetch([
      { path: '/metadata/objects/predio', body: definition('predio') },
      { path: '/metadata/objects/titular', body: definition('titular') },
      { path: /^\/objects\/\w+\/views/, status: 404, body: { title: 'Not Found' } },
      { path: '/objects/predio/records', body: one },
      { path: '/objects/titular/records', body: one },
      { method: 'DELETE', path: '/objects/predio/records/r1', status: 409, body: { title: 'Conflict', detail: 'Refused' } }
    ])
    renderWithProviders(
      <>
        <RecordListPage />
        <Link to="/data/objects/titular/records">titulares</Link>
      </>,
      { route: '/data/objects/predio/records', path: 'data/objects/:object/records' }
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Refused')

    await userEvent.click(screen.getByRole('link', { name: 'titulares' }))
    expect(await screen.findByRole('heading', { name: 'titular' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
