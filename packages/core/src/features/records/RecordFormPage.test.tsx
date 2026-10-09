import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import type { ObjectDefinition } from '../../types/metadata'
import { RecordFormPage } from './RecordFormPage'

const predio: ObjectDefinition = {
  id: 'o1',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  fields: [
    {
      id: 'f1',
      name: 'codigo',
      label: 'Código',
      type: 'TEXT',
      required: false,
      unique: false,
      defaultValue: null,
      description: null,
      position: 0,
      enumOptions: null,
      relationTarget: null,
      visible: true,
      editable: true
    }
  ]
}

const renderPage = () => renderWithProviders(<RecordFormPage />, { route: '/data/objects/predio/records/new', path: 'data/objects/:object/records/new' })

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('RecordFormPage', () => {
  // the object never arrives on a failure: this read "Cargando…" for ever
  it('says the object could not be loaded, and retries', async () => {
    fetch = mockFetch([{ path: '/metadata/objects/predio', status: 500, body: { title: 'Internal Server Error', detail: 'Base de datos caída' } }])
    renderWithProviders(<RecordFormPage />, { route: '/data/objects/predio/records/new', path: 'data/objects/:object/records/new' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Base de datos caída')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(fetch.calls.filter((call) => call.path === '/metadata/objects/predio')).toHaveLength(2)
  })

  it('creates with the reason', async () => {
    fetch = mockFetch([
      { path: '/metadata/objects/predio', body: { ...predio, requiresReason: true } },
      { method: 'POST', path: '/objects/predio/records', body: { id: 'n1', createdAt: null, updatedAt: null, attributes: { codigo: 'P-9' } } }
    ])
    renderPage()

    await userEvent.type(await screen.findByLabelText('Código'), 'P-9')
    await userEvent.type(screen.getByLabelText(/Motivo/), 'alta inicial')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(fetch?.calls.some((call) => call.method === 'POST')).toBe(true))
    const post = fetch.calls.find((call) => call.method === 'POST')!
    expect(post.body).toEqual({ attributes: { codigo: 'P-9' } })
    expect(post.headers['x-change-reason']).toBe("UTF-8''alta%20inicial")
  })

  it('marks the field a create was refused on', async () => {
    fetch = mockFetch([
      { path: '/metadata/objects/predio', body: predio },
      {
        method: 'POST',
        path: '/objects/predio/records',
        status: 409,
        body: { title: 'Conflict', detail: 'Another record already has this codigo', errors: [{ field: 'codigo', message: 'must be unique' }] }
      }
    ])
    renderPage()

    await userEvent.type(await screen.findByLabelText('Código'), 'P-9')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('must be unique')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Another record already has this codigo')
  })

  it('offers no form on an api-only object', async () => {
    fetch = mockFetch([{ path: '/metadata/objects/predio', body: { ...predio, apiOnly: true } }])
    renderPage()

    expect(await screen.findByText('Este objeto solo lo escribe la aplicación: aquí es de solo lectura.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
    expect(screen.queryByLabelText('Código')).toBeNull()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })
})
