import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { ApiError } from '../../api/client'
import type { WasichaiModule } from '../../registry/contract'
import type { ObjectDefinition, Relationship, SystemField } from '../../types/metadata'
import { sketchModule } from '../../test/fakeModules'

const updateObject = vi.fn()
const deleteObject = vi.fn()
const deleteField = vi.fn()
const updateField = vi.fn()
const addField = vi.fn()
const updateRelationship = vi.fn()
const deleteRelationship = vi.fn()
const createAction = vi.fn()
const deleteAction = vi.fn()

// predio owns the column of 'titular'; 'ajena' has nothing to do with this object
const relationships: Relationship[] = [
  {
    id: 'r1',
    name: 'titular',
    label: 'Titular',
    inverseLabel: 'Predios',
    type: 'MANY_TO_ONE',
    source: 'predio',
    target: 'contribuyente',
    fieldName: 'titular',
    joinTable: null
  },
  {
    id: 'r2',
    name: 'ajena',
    label: 'Ajena',
    inverseLabel: null,
    type: 'MANY_TO_ONE',
    source: 'via',
    target: 'distrito',
    fieldName: 'distrito',
    joinTable: null
  }
]

const systemFields: SystemField[] = [
  { name: 'id', type: 'UUID', scope: 'ALWAYS' },
  { name: 'created_at', type: 'DATETIME', scope: 'ALWAYS' },
  { name: 'workflow_state', type: 'TEXT', scope: 'WORKFLOW' },
  { name: 'version', type: null, scope: 'RESERVED' }
]

const definition: ObjectDefinition = {
  id: 'obj-1',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  // a rule and a list already set: saving the labels must leave both alone
  appendOnly: true,
  indexes: [['revisado', 'titular']],
  geometry: null,
  fields: [
    {
      id: 'f-1',
      name: 'revisado',
      label: 'Revisado',
      type: 'BOOLEAN',
      required: false,
      unique: false,
      defaultValue: null,
      description: null,
      position: 0,
      enumOptions: null,
      relationTarget: null,
      geometry: null,
      visible: true,
      editable: true
    },
    // the column the 'titular' relationship created
    {
      id: 'f-2',
      name: 'titular',
      label: 'Titular',
      type: 'RELATION',
      required: false,
      unique: false,
      defaultValue: null,
      description: null,
      position: 1,
      enumOptions: null,
      relationTarget: 'contribuyente',
      geometry: null,
      visible: true,
      editable: true
    }
  ]
}

// what the server answers now: a refetch after a field change swaps it for a new object
let current: ObjectDefinition = definition
// what the actions list answers now
let actionsQuery: { data?: { name: string; label: string }[]; isLoading: boolean; error: unknown } = {
  data: [{ name: 'ANULAR', label: 'Anular' }],
  isLoading: false,
  error: null
}

vi.mock('../../queries', () => ({
  useObjectDefinition: () => ({ data: current, isLoading: false }),
  useObjects: () => ({ data: [] }),
  useSystemFields: () => ({ data: systemFields }),
  useUpdateObject: () => ({ mutateAsync: updateObject, isPending: false }),
  useDeleteObject: () => ({ mutateAsync: deleteObject, isPending: false }),
  useAddField: () => ({ mutateAsync: addField, isPending: false }),
  useUpdateField: () => ({ mutateAsync: updateField, isPending: false }),
  useDeleteField: () => ({ mutateAsync: deleteField, isPending: false }),
  useRelationships: () => ({ data: relationships }),
  useCreateRelationship: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRelationship: () => ({ mutateAsync: updateRelationship, isPending: false }),
  useDeleteRelationship: () => ({ mutateAsync: deleteRelationship, isPending: false }),
  useObjectActions: () => actionsQuery,
  useCreateObjectAction: () => ({ mutateAsync: createAction, isPending: false }),
  useDeleteObjectAction: () => ({ mutateAsync: deleteAction, isPending: false })
}))

// predio has no workflow here: no module says otherwise, so the state column reads as reserved

const { ObjectEditorPage } = await import('./ObjectEditorPage')

function renderPage(modules: WasichaiModule[] = []) {
  return renderWithProviders(<ObjectEditorPage />, { route: '/data/objects/predio/edit', path: 'data/objects/:object/edit', modules })
}

async function openSystemFields(modules: WasichaiModule[] = []) {
  renderPage(modules)
  await userEvent.click(screen.getByRole('button', { name: /Campos del sistema|System fields/ }))
}

describe('ObjectEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    current = definition
    actionsQuery = { data: [{ name: 'ANULAR', label: 'Anular' }], isLoading: false, error: null }
  })

  // the server refuses a rename; the form must not invite one in the first place
  it('shows the technical name but does not let it be edited', () => {
    renderPage()
    const name = screen.getByDisplayValue('predio')
    expect(name).toBeDisabled()
  })

  it('keeps the delete button locked until the object name is typed exactly', async () => {
    const user = userEvent.setup()
    renderPage()
    const button = screen.getByRole('button', { name: /Eliminar objeto|Delete object/ })
    expect(button).toBeDisabled()

    const confirm = screen.getByPlaceholderText('predio')
    await user.type(confirm, 'predi')
    expect(button).toBeDisabled()

    await user.type(confirm, 'o')
    await waitFor(() => expect(button).toBeEnabled())
  })

  // a refused delete is the common case, so its reason has to reach the screen
  it('reports why the server refused a field delete', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    deleteField.mockRejectedValue(new ApiError(409, "Field 'revisado' is used by automation 'marca'"))

    renderPage()
    await user.click(screen.getByRole('button', { name: /Eliminar campo revisado|Delete field revisado/ }))

    expect(await screen.findByText(/is used by automation 'marca'/)).toBeInTheDocument()
  })

  it('asks before dropping a column, and drops nothing when the answer is no', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderPage()
    await user.click(screen.getByRole('button', { name: /Eliminar campo revisado|Delete field revisado/ }))

    expect(deleteField).not.toHaveBeenCalled()
  })

  // they are reference, not the subject of the page: one row folded instead of eight always shown
  it('keeps the columns the platform owns folded until they are asked for', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.queryByText('created_at')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Campos del sistema \(4\)|System fields \(4\)/ }))
    expect(screen.getByText('created_at')).toBeInTheDocument()
    expect(screen.getByText(/Los pone la plataforma|The platform puts these/)).toBeInTheDocument()
  })

  // the admin used to find out about these names through a 400
  it('lists the columns the platform owns, with no way to touch them', async () => {
    await openSystemFields()
    expect(screen.getByText('created_at')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /created_at/i })).not.toBeInTheDocument()
  })

  // predio has no workflow here, so the state column is a name it reserves, not one it has
  it('says a conditional name is only reserved while the condition is unmet', async () => {
    await openSystemFields()
    const state = screen.getByText('workflow_state').closest('tr')
    expect(state).toHaveTextContent(/solo con flujo|only with a workflow/)
  })

  // geom stopped being one of them: a geometry is a field the user names. ADR-019.
  it('does not claim the geometry column, which is a field now', () => {
    renderPage()
    expect(screen.queryByText('geom')).not.toBeInTheDocument()
  })

  it('refuses a field named after a system column before asking the server', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /Añadir campo|Add field/ }))
    await user.type(screen.getByLabelText(/^Nombre$|^Name$/), 'created_at')

    expect(screen.getByText(/lo usa la plataforma|belongs to the platform/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Crear$|^Create$/ })).toBeDisabled()
    expect(addField).not.toHaveBeenCalled()
  })

  it('refuses a field named after one that already exists', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /Añadir campo|Add field/ }))
    await user.type(screen.getByLabelText(/^Nombre$|^Name$/), 'revisado')

    expect(screen.getByText(/Ya hay un campo|There is already a field/)).toBeInTheDocument()
  })

  it('lists the relationships this object takes part in, and no others', () => {
    renderPage()
    expect(screen.getByLabelText(/^Etiqueta de la relación «titular»|^Label of relationship «titular»/)).toHaveValue('Titular')
    expect(screen.queryByLabelText(/relación «ajena»|relationship «ajena»/)).not.toBeInTheDocument()
  })

  it('saves a relationship label only when it actually changed', async () => {
    const user = userEvent.setup()
    renderPage()
    const label = screen.getByLabelText(/^Etiqueta de la relación «titular»|^Label of relationship «titular»/)

    await user.click(label)
    await user.tab()
    expect(updateRelationship).not.toHaveBeenCalled()

    await user.clear(label)
    await user.type(label, 'Propietario')
    await user.tab()
    await waitFor(() => expect(updateRelationship).toHaveBeenCalledWith({ name: 'titular', payload: { label: 'Propietario' } }))
  })

  // clearing it is a real change: the other side then falls back to the object's plural
  it('sends a cleared inverse label as null', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.clear(screen.getByLabelText(/inversa de la relación «titular»|Inverse label of relationship «titular»/))
    await user.tab()
    await waitFor(() => expect(updateRelationship).toHaveBeenCalledWith({ name: 'titular', payload: { inverseLabel: null } }))
  })

  // the server refuses it with a 409; offering the button was the lie
  it('will not let the column of a relationship be deleted from the fields table', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /Eliminar campo titular|Delete field titular/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Eliminar campo revisado|Delete field revisado/ })).toBeEnabled()
  })

  it('saves a field label only when it actually changed', async () => {
    const user = userEvent.setup()
    renderPage()
    const label = screen.getByDisplayValue('Revisado')

    await user.click(label)
    await user.tab()
    expect(updateField).not.toHaveBeenCalled()

    await user.clear(label)
    await user.type(label, 'Revisión')
    await user.tab()
    await waitFor(() => expect(updateField).toHaveBeenCalledWith({ field: 'revisado', payload: { label: 'Revisión' } }))
  })

  it("reads a conditional column as the object's own once a module says the condition is met", async () => {
    await openSystemFields([{ id: 'wf', objectFlags: () => ({ workflow: true }) }])
    const state = screen.getByText('workflow_state').closest('tr')
    expect(state).toHaveTextContent('Sistema')
    expect(state).not.toHaveTextContent('solo con flujo')
  })

  it('offers no unique toggle for a module field type that cannot be unique', () => {
    definition.fields.push({ ...definition.fields[0], id: 'f-croquis', name: 'croquis', label: 'Croquis', type: 'SKETCH', relationTarget: null })
    try {
      renderPage([sketchModule])
      const row = screen.getByText('croquis').closest('tr')
      expect(row).not.toHaveTextContent('Único')
    } finally {
      definition.fields.pop()
    }
  })

  describe('write rules and field sets', () => {
    const details = () => screen.getByText(/^Datos del objeto$|^Object details$/).closest('form') as HTMLElement
    const fieldSets = () => screen.getByText(/^Unicidad compuesta$|^Composite uniqueness$/).closest('[data-slot="card"]') as HTMLElement

    // the PUT keeps what it leaves out: an untouched rule or list must not go out at all
    it('saves the details without touching write rules or lists', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(within(details()).getByRole('button', { name: /^Guardar$|^Save$/ }))

      await waitFor(() => expect(updateObject).toHaveBeenCalledWith({ label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true }))
    })

    it('switches a write rule', async () => {
      const user = userEvent.setup()
      renderPage()
      const appendOnly = screen.getByLabelText(/^Solo anexado$|^Append-only$/)
      expect(appendOnly).toBeChecked()

      await user.click(appendOnly)
      await user.click(within(details()).getByRole('button', { name: /^Guardar$|^Save$/ }))

      await waitFor(() => expect(updateObject).toHaveBeenCalledWith(expect.objectContaining({ appendOnly: false })))
      expect(updateObject.mock.calls[0][0]).not.toHaveProperty('indexes')
    })

    it('adds a unique constraint and saves it', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.type(screen.getByLabelText(/^Añadir restricción$|^Add constraint$/), 'revisado, titular')
      await user.click(within(fieldSets()).getByRole('button', { name: /^Añadir restricción$|^Add constraint$/ }))
      expect(within(fieldSets()).getAllByText('revisado, titular')).toHaveLength(2)

      await user.click(within(fieldSets()).getByRole('button', { name: /^Guardar$|^Save$/ }))
      await waitFor(() => expect(updateObject).toHaveBeenCalledWith(expect.objectContaining({ uniqueConstraints: [['revisado', 'titular']] })))
      expect(updateObject.mock.calls[0][0]).not.toHaveProperty('indexes')
    })

    // one field is unique: true on the field, which the server insists on
    it('refuses a one-field unique constraint', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.type(screen.getByLabelText(/^Añadir restricción$|^Add constraint$/), 'revisado')

      expect(screen.getByText(/Hacen falta al menos 2 campos|At least 2 fields/)).toBeInTheDocument()
      expect(within(fieldSets()).getByRole('button', { name: /^Añadir restricción$|^Add constraint$/ })).toBeDisabled()
    })

    it('removes a composite index', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('button', { name: /^(Quitar|Remove) revisado, titular$/ }))
      await user.click(within(fieldSets()).getByRole('button', { name: /^Guardar$|^Save$/ }))

      await waitFor(() => expect(updateObject).toHaveBeenCalledWith(expect.objectContaining({ indexes: [] })))
    })

    // every field or relationship change refetches the definition; an added set not saved yet must survive it
    it('keeps unsaved rules and sets across a refetch, and takes what changed on the server', async () => {
      const user = userEvent.setup()
      const { rerender } = renderPage()
      await user.type(screen.getByLabelText(/^Añadir restricción$|^Add constraint$/), 'revisado, titular')
      await user.click(within(fieldSets()).getByRole('button', { name: /^Añadir restricción$|^Add constraint$/ }))
      await user.click(screen.getByLabelText(/^Solo anexado$|^Append-only$/))

      // someone else switched requiresReason meanwhile
      current = { ...definition, requiresReason: true }
      rerender(<ObjectEditorPage />)

      expect(within(fieldSets()).getAllByText('revisado, titular')).toHaveLength(2)
      expect(screen.getByLabelText(/^Solo anexado$|^Append-only$/)).not.toBeChecked()
      expect(screen.getByLabelText(/^Pide motivo$|^Requires a reason$/)).toBeChecked()

      await user.click(within(fieldSets()).getByRole('button', { name: /^Guardar$|^Save$/ }))
      await waitFor(() =>
        expect(updateObject).toHaveBeenCalledWith({
          label: 'Predio',
          pluralLabel: 'Predios',
          description: null,
          enabled: true,
          appendOnly: false,
          uniqueConstraints: [['revisado', 'titular']]
        })
      )
    })

    // same component, another object: nothing typed for the last one may follow
    it('drops the edits when the editor moves to another object', async () => {
      const user = userEvent.setup()
      const { rerender } = renderPage()
      await user.type(screen.getByLabelText(/^Añadir restricción$|^Add constraint$/), 'revisado, titular')
      await user.click(within(fieldSets()).getByRole('button', { name: /^Añadir restricción$|^Add constraint$/ }))

      current = { ...definition, id: 'obj-2', name: 'via', label: 'Vía', pluralLabel: 'Vías', appendOnly: false, indexes: undefined }
      rerender(<ObjectEditorPage />)

      expect(within(fieldSets()).queryByText('revisado, titular')).not.toBeInTheDocument()
    })

    // the field-sets Save skips the details form, and so its required label
    it('sends nothing with a cleared label', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.clear(screen.getByDisplayValue('Predio'))
      await user.click(within(fieldSets()).getByRole('button', { name: /^Guardar$|^Save$/ }))

      expect(updateObject).not.toHaveBeenCalled()
    })

    it('toggles a field index', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByLabelText(/^Indexado revisado$|^Indexed revisado$/))

      await waitFor(() => expect(updateField).toHaveBeenCalledWith({ field: 'revisado', payload: { indexed: true } }))
    })

    it('offers the index toggle on a new field', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('button', { name: /Añadir campo|Add field/ }))
      await user.type(screen.getByLabelText(/^Nombre$|^Name$/), 'anio')
      // by role: the table's own boxes are named after their field
      await user.click(screen.getByRole('checkbox', { name: /^Indexado$|^Indexed$/ }))
      await user.click(screen.getByRole('button', { name: /^Crear$|^Create$/ }))

      await waitFor(() => expect(addField).toHaveBeenCalledWith(expect.objectContaining({ name: 'anio', indexed: true })))
    })
  })

  describe('declared actions', () => {
    const actions = () => screen.getByText(/^Acciones propias$|^Declared actions$/).closest('[data-slot="card"]') as HTMLElement

    it('lists what the object declares', () => {
      renderPage()
      expect(within(actions()).getByText('ANULAR')).toBeInTheDocument()
      expect(within(actions()).getByText('Anular')).toBeInTheDocument()
    })

    // the server stores it upper case; the screen shows it the way it will be stored
    it('declares an action upper-cased', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.type(within(actions()).getByLabelText(/^Nombre técnico$|^Technical name$/), 'anular_ajeno')
      expect(within(actions()).getByLabelText(/^Nombre técnico$|^Technical name$/)).toHaveValue('ANULAR_AJENO')
      await user.type(within(actions()).getByLabelText(/^Etiqueta$|^Label$/), 'Anular ajeno')
      await user.click(within(actions()).getByRole('button', { name: /^Declarar acción$|^Declare action$/ }))

      await waitFor(() => expect(createAction).toHaveBeenCalledWith({ name: 'ANULAR_AJENO', label: 'Anular ajeno' }))
      await waitFor(() => expect(within(actions()).getByLabelText(/^Nombre técnico$|^Technical name$/)).toHaveValue(''))
    })

    it('refuses a built-in or repeated name before asking the server', async () => {
      const user = userEvent.setup()
      renderPage()
      const name = within(actions()).getByLabelText(/^Nombre técnico$|^Technical name$/)
      const declare = within(actions()).getByRole('button', { name: /^Declarar acción$|^Declare action$/ })

      await user.type(name, 'update')
      expect(within(actions()).getByText(/acción de la plataforma|built-in action/)).toBeInTheDocument()
      expect(declare).toBeDisabled()

      await user.clear(name)
      await user.type(name, 'anular')
      expect(within(actions()).getByText(/Ya está declarada|Already declared/)).toBeInTheDocument()
      expect(declare).toBeDisabled()
    })

    it('removes an action after confirming', async () => {
      const user = userEvent.setup()
      const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
      renderPage()
      const remove = within(actions()).getByRole('button', { name: /ANULAR/ })

      await user.click(remove)
      expect(deleteAction).not.toHaveBeenCalled()

      await user.click(remove)
      expect(confirm).toHaveBeenLastCalledWith(expect.stringMatching(/ANULAR/))
      await waitFor(() => expect(deleteAction).toHaveBeenCalledWith('ANULAR'))
    })

    it('says why the server refused', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      deleteAction.mockRejectedValueOnce(new ApiError(404, "Action 'ANULAR' is not declared"))
      renderPage()

      await user.click(within(actions()).getByRole('button', { name: /ANULAR/ }))

      expect(await within(actions()).findByRole('alert')).toHaveTextContent(/is not declared/)
    })

    // an empty list and a failed one are not the same thing
    it('says it is loading, not that there are none', () => {
      actionsQuery = { data: undefined, isLoading: true, error: null }
      renderPage()
      expect(within(actions()).getByText(/Cargando|Loading/)).toBeInTheDocument()
      expect(within(actions()).queryByText(/aún no declara|declares no actions/)).not.toBeInTheDocument()
    })

    it('says why the list could not be read', () => {
      actionsQuery = { data: undefined, isLoading: false, error: new ApiError(403, 'Forbidden: READ on predio') }
      renderPage()
      expect(within(actions()).getByRole('alert')).toHaveTextContent(/READ on predio/)
      expect(within(actions()).queryByText(/aún no declara|declares no actions/)).not.toBeInTheDocument()
    })
  })
})
