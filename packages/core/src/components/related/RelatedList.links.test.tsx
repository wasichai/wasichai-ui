import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import type { RelatedSide } from '../../types/metadata'
import { RelatedList } from './RelatedList'

vi.mock('@wasichai/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/ui')>()),
  ...(await import('../../test/nativeSelect'))
}))

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

const side: RelatedSide = {
  relationship: 'predio_titular',
  label: 'Titulares',
  type: 'MANY_TO_MANY',
  objectName: 'titular',
  objectLabel: 'Titular',
  many: true
}
const predio = { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }
const titular = { id: 'o2', name: 'titular', label: 'Titular', pluralLabel: 'Titulares', description: null, enabled: true, fields: [] }
const page = (ids: string[]) => ({
  content: ids.map((id) => ({ id, createdAt: null, updatedAt: null, attributes: {} })),
  page: 0,
  size: 25,
  totalElements: ids.length,
  totalPages: 1
})

// a refused link or unlink (append-only end, no permission) used to change nothing on screen
describe('RelatedList links', () => {
  it('says why a link was refused, and keeps the pick', async () => {
    fetch = mockFetch([
      { path: '/metadata/objects/predio', body: predio },
      { path: '/metadata/objects/titular', body: titular },
      { path: '/objects/predio/records/r1/related/predio_titular', body: page([]) },
      { path: '/objects/titular/records', body: page(['t1']) },
      {
        method: 'POST',
        path: '/objects/predio/records/r1/related/predio_titular',
        status: 409,
        body: { title: 'Conflict', detail: 'El otro lado es de solo anexado' }
      }
    ])
    renderWithProviders(<RelatedList objectName="predio" recordId="r1" side={side} />)

    await userEvent.selectOptions(screen.getByRole('combobox'), await screen.findByRole('option', { name: 't1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Vincular' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El otro lado es de solo anexado')
    expect(screen.getByRole('combobox')).toHaveValue('t1')
  })

  it('says why an unlink was refused', async () => {
    fetch = mockFetch([
      { path: '/metadata/objects/predio', body: predio },
      { path: '/metadata/objects/titular', body: titular },
      { path: '/objects/predio/records/r1/related/predio_titular', body: page(['t1']) },
      { path: '/objects/titular/records', body: page([]) },
      {
        method: 'DELETE',
        path: '/objects/predio/records/r1/related/predio_titular/t1',
        status: 403,
        body: { title: 'Forbidden', detail: 'Sin permiso para editar titular' }
      }
    ])
    renderWithProviders(<RelatedList objectName="predio" recordId="r1" side={side} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Desvincular' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin permiso para editar titular')
  })

  describe('write rules', () => {
    // either end's rules hold for a link
    const mountLinks = (rules: { predio?: Record<string, boolean>; titular?: Record<string, boolean> }, linked: string[] = []) => {
      const routes: MockRoute[] = [
        { path: '/metadata/objects/predio', body: { ...predio, ...rules.predio } },
        { path: '/metadata/objects/titular', body: { ...titular, ...rules.titular } },
        { path: '/objects/predio/records/r1/related/predio_titular', body: page(linked) },
        { path: '/objects/titular/records', body: page(['t1']) },
        { method: 'POST', path: '/objects/predio/records/r1/related/predio_titular', status: 204 },
        { method: 'DELETE', path: '/objects/predio/records/r1/related/predio_titular/t1', status: 204 }
      ]
      fetch = mockFetch(routes)
      renderWithProviders(<RelatedList objectName="predio" recordId="r1" side={side} />)
    }
    const pick = async () => {
      await userEvent.selectOptions(screen.getByRole('combobox'), await screen.findByRole('option', { name: 't1' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Vincular' })).toBeEnabled())
      await userEvent.click(screen.getByRole('button', { name: 'Vincular' }))
    }

    it('asks for a reason when either end requires one', async () => {
      mountLinks({ titular: { requiresReason: true } })

      await pick()
      const dialog = screen.getByRole('dialog', { name: 'Vincular' })
      expect(fetch?.calls.some((call) => call.method === 'POST')).toBe(false)
      await userEvent.type(within(dialog).getByLabelText('Motivo'), 'titular nuevo')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Vincular' }))

      await waitFor(() => expect(fetch?.calls.some((call) => call.method === 'POST')).toBe(true))
      const post = fetch!.calls.find((call) => call.method === 'POST')!
      expect(post.headers['x-change-reason']).toBe("UTF-8''titular%20nuevo")
      expect(post.body).toEqual({ otherId: 't1' })
    })

    it('links nothing when the prompt is cancelled', async () => {
      mountLinks({ titular: { requiresReason: true } })

      await pick()
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(fetch?.calls.some((call) => call.method === 'POST')).toBe(false)
      expect(screen.getByRole('combobox')).toHaveValue('t1')
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('unlinks with a reason', async () => {
      mountLinks({ predio: { requiresReason: true } }, ['t1'])

      const unlink = await screen.findByRole('button', { name: 'Desvincular' })
      await waitFor(() => expect(unlink).toBeEnabled())
      await userEvent.click(unlink)
      const dialog = screen.getByRole('dialog', { name: 'Desvincular' })
      await userEvent.type(within(dialog).getByLabelText('Motivo'), 'error de carga')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Desvincular' }))

      await waitFor(() => expect(fetch?.calls.some((call) => call.method === 'DELETE')).toBe(true))
      expect(fetch?.calls.find((call) => call.method === 'DELETE')?.headers['x-change-reason']).toBe("UTF-8''error%20de%20carga")
    })

    it('links at once when neither end requires a reason', async () => {
      mountLinks({})

      await pick()

      await waitFor(() => expect(fetch?.calls.some((call) => call.method === 'POST')).toBe(true))
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(fetch?.calls.find((call) => call.method === 'POST')?.headers['x-change-reason']).toBeUndefined()
    })

    it('offers no link or unlink when an end is append-only, and says why', async () => {
      mountLinks({ titular: { appendOnly: true } }, ['t1'])

      expect(await screen.findByText('Uno de los dos objetos es de solo anexado: no se vincula ni se desvincula.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Vincular' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Desvincular' })).toBeNull()
      // the linked record is still listed, only the writes are gone
      expect(screen.getByRole('link', { name: 'Editar' })).toBeInTheDocument()
    })
  })
})
