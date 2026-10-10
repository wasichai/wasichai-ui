import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
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

  describe('write rules', () => {
    const predio = { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }
    const one = { content: [{ id: 'r1', createdAt: null, updatedAt: null, attributes: {} }], page: 0, size: 20, totalElements: 1, totalPages: 1 }
    const mountList = (rules: Record<string, boolean>, answers: MockRoute[] = []) => {
      fetch = mockFetch([
        ...answers,
        { path: '/metadata/objects/predio', body: { ...predio, ...rules } },
        { path: '/objects/predio/views', status: 404, body: { title: 'Not Found' } },
        { path: '/objects/predio/records', body: one },
        { method: 'DELETE', path: '/objects/predio/records/r1', status: 204 }
      ])
      renderWithProviders(<RecordListPage />, { route: '/data/objects/predio/records', path: 'data/objects/:object/records' })
    }

    it('asks for a reason before deleting and sends it', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
      mountList({ requiresReason: true })

      await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))
      const dialog = screen.getByRole('dialog', { name: '¿Eliminar este registro?' })
      await userEvent.type(within(dialog).getByLabelText('Motivo'), 'duplicado')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

      await waitFor(() => expect(fetch?.calls.some((call) => call.method === 'DELETE')).toBe(true))
      expect(fetch?.calls.find((call) => call.method === 'DELETE')?.headers['x-change-reason']).toBe("UTF-8''duplicado")
      expect(confirm).not.toHaveBeenCalled()
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    })

    it('deletes nothing when the reason prompt is cancelled', async () => {
      mountList({ requiresReason: true })

      await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await userEvent.keyboard('{Escape}')

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(fetch?.calls.some((call) => call.method === 'DELETE')).toBe(false)
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('keeps the earlier refusal on screen when the next prompt is cancelled', async () => {
      mountList({ requiresReason: true }, [
        { method: 'DELETE', path: '/objects/predio/records/r1', status: 409, body: { title: 'Conflict', detail: 'Refused' } }
      ])

      await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))
      await userEvent.type(within(screen.getByRole('dialog')).getByLabelText('Motivo'), 'duplicado')
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Refused')

      await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
      await userEvent.keyboard('{Escape}')

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(screen.getByRole('alert')).toHaveTextContent('Refused')
      expect(fetch?.calls.filter((call) => call.method === 'DELETE')).toHaveLength(1)
    })

    it('says a refused reason once, in the dialog', async () => {
      const refusal = { title: 'Bad Request', detail: 'A reason is required', errors: [{ field: 'reason', message: 'send the X-Change-Reason header' }] }
      mountList({ requiresReason: true }, [{ method: 'DELETE', path: '/objects/predio/records/r1', status: 400, body: refusal }])

      await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))
      const dialog = screen.getByRole('dialog')
      await userEvent.type(within(dialog).getByLabelText('Motivo'), 'duplicado')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('send the X-Change-Reason header')
      expect(screen.queryByText(/A reason is required/)).toBeNull()
    })

    it('offers no delete and says why on an append-only object', async () => {
      mountList({ appendOnly: true })

      expect(await screen.findByText('Los registros de este objeto solo se crean: no se editan ni se eliminan.')).toBeInTheDocument()
      // the row is there, its delete is not
      await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2))
      expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull()
      expect(screen.getByRole('link', { name: /Nuevo registro/ })).toBeInTheDocument()
    })

    it('offers no new record on an api-only object', async () => {
      mountList({ apiOnly: true })

      expect(await screen.findByText('Este objeto solo lo escribe la aplicación: aquí es de solo lectura.')).toBeInTheDocument()
      await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2))
      expect(screen.queryByRole('link', { name: /Nuevo registro/ })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull()
    })
  })
})
