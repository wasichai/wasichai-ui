import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import type { ReactElement } from 'react'
import { Route, Routes, useParams } from 'react-router'
import type { WasichaiModule } from '../../registry/contract'
import type { ObjectDefinition } from '../../types/metadata'
import { RecordFormPage } from './RecordFormPage'
import type { RecordRoutes } from './recordScreen'

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

  // an app shows one of its objects inside its own module, with core's form (#182)
  describe('by props', () => {
    const Screen = () => null
    const lms: WasichaiModule = {
      id: 'lms',
      basePath: 'lms',
      routes: [
        { id: 'lessons', path: 'lessons', component: Screen },
        { id: 'newLesson', path: 'lessons/new', component: Screen },
        { id: 'lesson', path: 'lessons/:id', component: Screen },
        { id: 'editLesson', path: 'lessons/:id/edit', component: Screen }
      ]
    }
    const routes: RecordRoutes = { records: 'lms:lessons', record: 'lms:lesson', newRecord: 'lms:newLesson' }
    const stored = { id: 'r1', createdAt: null, updatedAt: null, attributes: { codigo: 'P-1' } }
    const Opened = () => <p>{`abierta ${useParams().id}`}</p>
    const inLms = (form: ReactElement, route: string) =>
      renderWithProviders(
        <Routes>
          <Route path="lms/lessons/new" element={form} />
          <Route path="lms/lessons/:id/edit" element={form} />
          <Route path="lms/lessons/:id" element={<Opened />} />
        </Routes>,
        { route, modules: [lms] }
      )

    it('creates the object it is given and opens the new record inside the app module', async () => {
      fetch = mockFetch([
        { path: '/metadata/objects/predio', body: predio },
        { method: 'POST', path: '/objects/predio/records', body: { ...stored, id: 'n1' } }
      ])
      inLms(<RecordFormPage objectName="predio" routes={routes} />, '/lms/lessons/new')

      expect(await screen.findByRole('heading', { name: 'Nuevo registro · Predio' })).toBeInTheDocument()
      await userEvent.type(screen.getByLabelText('Código'), 'P-1')
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByText('abierta n1')).toBeInTheDocument()
    })

    it('edits the record of the route and lands on the app record route', async () => {
      fetch = mockFetch([
        { path: '/metadata/objects/predio', body: predio },
        { path: '/objects/predio/records/r1', body: stored },
        { method: 'PUT', path: '/objects/predio/records/r1', body: { ...stored, attributes: { codigo: 'P-2' } } }
      ])
      inLms(<RecordFormPage objectName="predio" routes={routes} />, '/lms/lessons/r1/edit')

      expect(await screen.findByRole('heading', { name: 'Editar registro · Predio' })).toBeInTheDocument()
      const input = screen.getByLabelText('Código')
      expect(input).toHaveValue('P-1')
      await userEvent.clear(input)
      await userEvent.type(input, 'P-2')
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByText('abierta r1')).toBeInTheDocument()
      expect(fetch.calls.find((call) => call.method === 'PUT')?.body).toEqual({ attributes: { codigo: 'P-2' } })
    })

    it('says the record to edit could not be loaded instead of loading for ever', async () => {
      fetch = mockFetch([
        { path: '/metadata/objects/predio', body: predio },
        { path: '/objects/predio/records/r1', status: 404, body: { title: 'Not Found', detail: 'Record not found' } }
      ])
      renderWithProviders(<RecordFormPage objectName="predio" recordId="r1" />)

      expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el registro')
      expect(screen.queryByLabelText('Código')).toBeNull()
    })

    it('reads an edit the object rules refuse along, and says why', async () => {
      fetch = mockFetch([
        { path: '/metadata/objects/predio', body: { ...predio, appendOnly: true } },
        { path: '/objects/predio/records/r1', body: stored }
      ])
      renderWithProviders(<RecordFormPage objectName="predio" recordId="r1" />)

      expect(await screen.findByText('Los registros de este objeto solo se crean: no se editan ni se eliminan.')).toBeInTheDocument()
      expect(screen.getByLabelText('Código')).toBeDisabled()
      expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
    })

    it('read only: shows the record it is given without a save', async () => {
      fetch = mockFetch([
        { path: '/metadata/objects/predio', body: predio },
        { path: '/objects/predio/records/r1', body: stored }
      ])
      renderWithProviders(<RecordFormPage objectName="predio" recordId="r1" readOnly />)

      expect(await screen.findByLabelText('Código')).toHaveValue('P-1')
      expect(screen.getByLabelText('Código')).toBeDisabled()
      expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
      expect(fetch.calls.some((call) => call.method !== 'GET')).toBe(false)
    })

    it('read only: draws no create form', async () => {
      fetch = mockFetch([{ path: '/metadata/objects/predio', body: predio }])
      renderWithProviders(<RecordFormPage objectName="predio" readOnly />)

      expect(await screen.findByText('Aquí los registros son de solo lectura.')).toBeInTheDocument()
      expect(screen.queryByLabelText('Código')).toBeNull()
      expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
    })
  })
})
