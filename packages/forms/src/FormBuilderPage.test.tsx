import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { coreModule, type FieldMeta, type Form, type ObjectDefinition } from '@wasichai/core'
import { FormBuilderPage } from './FormBuilderPage'
import { formsModule } from './module'

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

const stored: Form = {
  id: 'fm1',
  name: 'alta',
  label: 'Alta',
  objectName: 'predio',
  generated: false,
  definition: { sections: [{ title: 'Datos', fields: ['codigo'] }] }
}

let fetch: FetchMock | null = null
afterEach(() => {
  fetch?.restore()
  vi.restoreAllMocks()
})

function serve(forms: Form[]) {
  fetch = mockFetch([
    { path: '/objects', body: [predio] },
    { path: '/metadata/objects/predio', body: predio },
    { path: '/objects/predio/forms', body: forms },
    { method: 'POST', path: '/objects/predio/forms', body: { ...stored, id: 'fm2', name: 'predio_alta' } },
    { method: 'PUT', path: '/objects/predio/forms/alta', body: stored },
    { method: 'DELETE', path: '/objects/predio/forms/alta', status: 204 }
  ])
  return fetch
}

async function openPredio() {
  // formsModule's nav item targets core's 'builder' group: coreModule must be present to declare it
  renderWithProviders(<FormBuilderPage />, { modules: [coreModule, formsModule()] })
  // findAllByRole('combobox') resolves as soon as the (empty) select renders, before the /objects
  // fetch fills it, and selectOptions then fails to find "predio": wait for the option to exist first
  await screen.findByRole('option', { name: 'Predio' })
  // the first select is the object picker: its trigger has no label in the original app either
  await userEvent.selectOptions((await screen.findAllByRole('combobox'))[0], 'predio')
  await screen.findByLabelText('Nombre técnico')
}

describe('FormBuilderPage', () => {
  it('creates a new form from a blank one with a titled section and its fields', async () => {
    const calls = serve([stored])
    await openPredio()

    // second select: the form picker. its last option starts a blank form
    await userEvent.selectOptions(screen.getAllByRole('combobox')[1], '__new__')
    await userEvent.type(screen.getByLabelText('Nombre técnico'), 'predio_alta')
    await userEvent.type(screen.getByLabelText('Etiqueta'), 'Alta de predio')
    await userEvent.type(screen.getByLabelText('Título de la sección'), 'Datos generales')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Añadir campo 1' }), 'area')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Añadir campo 1' }), 'codigo')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await vi.waitFor(() => expect(calls.calls.some((call) => call.method === 'POST')).toBe(true))
    const post = calls.calls.find((call) => call.method === 'POST')
    expect(post?.path).toBe('/objects/predio/forms')
    expect(post?.body).toEqual({
      name: 'predio_alta',
      label: 'Alta de predio',
      definition: { sections: [{ title: 'Datos generales', fields: ['area', 'codigo'] }] }
    })
  })

  it('keeps a field in one section only and updates a stored form in place', async () => {
    const calls = serve([stored])
    await openPredio()

    expect(screen.getByLabelText('Nombre técnico')).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /Añadir sección/ }))
    const second = screen.getByRole('combobox', { name: 'Añadir campo 2' })
    // codigo already sits in the first section
    expect(within(second).queryByRole('option', { name: 'Código' })).not.toBeInTheDocument()
    await userEvent.selectOptions(second, 'area')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await vi.waitFor(() => expect(calls.calls.some((call) => call.method === 'PUT')).toBe(true))
    const put = calls.calls.find((call) => call.method === 'PUT')
    expect(put?.path).toBe('/objects/predio/forms/alta')
    expect(put?.body).toEqual({
      label: 'Alta',
      definition: {
        sections: [
          { title: 'Datos', fields: ['codigo'] },
          { title: null, fields: ['area'] }
        ]
      }
    })
  })

  it('resets a stored form by deleting it once the admin confirms', async () => {
    const calls = serve([stored])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await openPredio()

    await userEvent.click(screen.getByRole('button', { name: /Restablecer/ }))

    await vi.waitFor(() => expect(calls.calls.some((call) => call.method === 'DELETE')).toBe(true))
    expect(calls.calls.find((call) => call.method === 'DELETE')?.path).toBe('/objects/predio/forms/alta')
  })
})
