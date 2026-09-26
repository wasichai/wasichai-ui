import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { coreModule, type FieldMeta, type ObjectDefinition, type View } from '@wasichai/core'
import { viewsModule } from './module'
import { ViewBuilderPage } from './ViewBuilderPage'

vi.mock('@wasichai/ui', async (importOriginal) => ({ ...(await importOriginal<typeof import('@wasichai/ui')>()), ...(await import('./test/nativeSelect')) }))

function field(name: string, label: string, position: number): FieldMeta {
  return {
    id: `f-${name}`,
    name,
    label,
    type: 'TEXT',
    required: false,
    unique: false,
    defaultValue: null,
    description: null,
    position,
    enumOptions: null,
    relationTarget: null,
    visible: true,
    editable: true
  }
}

const predio: ObjectDefinition = {
  id: 'o1',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  fields: [field('codigo', 'Código', 0), field('area', 'Área', 1)]
}

const generated: View = {
  id: '',
  name: 'default',
  label: '',
  objectName: 'predio',
  isDefault: true,
  generated: true,
  definition: { columns: ['codigo'], filters: {}, sort: null, pageSize: 25 }
}

const stored: View = {
  id: 'v1',
  name: 'activos',
  label: 'Activos',
  objectName: 'predio',
  isDefault: false,
  generated: false,
  definition: { columns: ['codigo', 'area'], filters: {}, sort: null, pageSize: 10 }
}

let fetch: FetchMock | null = null
afterEach(() => {
  fetch?.restore()
  vi.restoreAllMocks()
})

function serve(views: View[]) {
  fetch = mockFetch([
    { path: '/objects', body: [predio] },
    { path: '/metadata/objects/predio', body: predio },
    { path: '/objects/predio/views', body: views },
    { method: 'POST', path: '/objects/predio/views', body: { ...generated, id: 'v2', name: 'predios_activos', generated: false } },
    { method: 'PUT', path: '/objects/predio/views/activos', body: stored },
    { method: 'DELETE', path: '/objects/predio/views/activos', status: 204 }
  ])
  return fetch
}

async function openPredio() {
  // the module's own nav sits in core's 'builder' group; registering only viewsModule() would
  // throw "unknown nav group" (createRegistry validates nav against declared groups)
  renderWithProviders(<ViewBuilderPage />, { modules: [coreModule, viewsModule()] })
  // the first select is the object picker: its trigger has no label in the original app either. wait for its
  // option to exist first: findAllByRole('combobox') resolves as soon as the (empty) select
  // renders, before the /objects fetch fills it, and selectOptions then fails to find "predio"
  await screen.findByRole('option', { name: 'Predio' })
  await userEvent.selectOptions((await screen.findAllByRole('combobox'))[0], 'predio')
  await screen.findByLabelText('Nombre técnico')
}

describe('ViewBuilderPage', () => {
  it('saves a generated view as a new one with the columns the admin added', async () => {
    const calls = serve([generated])
    await openPredio()

    await userEvent.clear(screen.getByLabelText('Nombre técnico'))
    await userEvent.type(screen.getByLabelText('Nombre técnico'), 'predios_activos')
    await userEvent.type(screen.getByLabelText('Etiqueta'), 'Predios activos')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Añadir columna' }), 'area')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await vi.waitFor(() => expect(calls.calls.some((call) => call.method === 'POST')).toBe(true))
    const post = calls.calls.find((call) => call.method === 'POST')
    expect(post?.path).toBe('/objects/predio/views')
    expect(post?.body).toEqual({
      name: 'predios_activos',
      label: 'Predios activos',
      isDefault: true,
      definition: { columns: ['codigo', 'area'], filters: {}, sort: null, pageSize: 25 }
    })
  })

  it('updates a stored view in place with its reordered columns and keeps its name', async () => {
    const calls = serve([stored])
    await openPredio()

    expect(screen.getByLabelText('Nombre técnico')).toBeDisabled()
    await userEvent.click(screen.getAllByRole('button', { name: 'Bajar' })[0])
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await vi.waitFor(() => expect(calls.calls.some((call) => call.method === 'PUT')).toBe(true))
    const put = calls.calls.find((call) => call.method === 'PUT')
    expect(put?.path).toBe('/objects/predio/views/activos')
    expect(put?.body).toEqual({ label: 'Activos', isDefault: false, definition: { columns: ['area', 'codigo'], filters: {}, sort: null, pageSize: 10 } })
  })

  it('resets a stored view by deleting it once the admin confirms', async () => {
    const calls = serve([stored])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await openPredio()

    await userEvent.click(screen.getByRole('button', { name: /Restablecer/ }))

    await vi.waitFor(() => expect(calls.calls.some((call) => call.method === 'DELETE')).toBe(true))
    expect(calls.calls.find((call) => call.method === 'DELETE')?.path).toBe('/objects/predio/views/activos')
  })
})
