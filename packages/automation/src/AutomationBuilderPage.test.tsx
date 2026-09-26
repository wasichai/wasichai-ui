import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { coreModule } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'

// radix's select cannot be driven in jsdom (pointer-events: none on its trigger), so it is doubled by
// a real <select>. the trigger's id keeps the <Label htmlFor> link; a select without one is named by
// its placeholder, the way the original app's TemplateEditor test does it.
vi.mock('@wasichai/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wasichai/ui')>()
  const find = (node: unknown, prop: 'id' | 'placeholder'): string | undefined => {
    if (Array.isArray(node)) return node.map((child) => find(child, prop)).find(Boolean)
    if (!node || typeof node !== 'object') return undefined
    const props = (node as { props?: Record<string, unknown> }).props
    if (!props) return undefined
    if (typeof props[prop] === 'string') return props[prop] as string
    return find(props.children, prop)
  }
  return {
    ...actual,
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => <option value={value}>{children}</option>,
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children?: ReactNode }) => {
      const id = find(children, 'id')
      return (
        <select id={id} aria-label={id ? undefined : find(children, 'placeholder')} value={value} onChange={(event) => onValueChange(event.target.value)}>
          <option value="" />
          {children}
        </select>
      )
    }
  }
})

import { AutomationBuilderPage } from './AutomationBuilderPage'
import { automationModule } from './module'

const predio = { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true }
const revisado = {
  id: 'f1',
  name: 'revisado',
  label: 'Revisado',
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
const stored = {
  id: 'a1',
  objectName: 'predio',
  name: 'marca-revisado',
  label: 'Marca revisado',
  enabled: true,
  definition: {
    trigger: { type: 'STATE_ENTERED', state: 'aprobado' },
    conditions: [],
    actions: [{ type: 'UPDATE_FIELD', field: 'revisado', value: 'si' }]
  }
}
const workflow = {
  id: 'w1',
  objectName: 'predio',
  name: 'tramite',
  label: 'Trámite',
  enabled: true,
  definition: {
    states: [{ name: 'aprobado', label: 'Aprobado', type: 'FINAL' }],
    transitions: [{ name: 'aprobar', label: 'Aprobar', from: 'borrador', to: 'aprobado', roles: [] }]
  }
}

function routes(workflowRoute: MockRoute): MockRoute[] {
  return [
    { path: '/objects', body: [predio] },
    { path: '/metadata/objects/predio', body: { ...predio, fields: [revisado] } },
    { path: '/objects/predio/automations', body: [stored] },
    { path: '/objects/predio/document-types', status: 404, body: { title: 'Not Found' } },
    { method: 'PUT', path: '/objects/predio/automations/marca-revisado', body: stored },
    workflowRoute
  ]
}

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

async function openStoredRule() {
  renderWithProviders(<AutomationBuilderPage />, { modules: [coreModule, automationModule()] })
  const objectPicker = await screen.findByRole('combobox', { name: 'Elige un objeto' })
  await screen.findByRole('option', { name: 'Predio' })
  await userEvent.selectOptions(objectPicker, 'predio')
  await userEvent.click(await screen.findByRole('button', { name: /Marca revisado/ }))
}

describe('AutomationBuilderPage', () => {
  it('leaves the state and transition pickers empty when the object has no workflow, and still saves', async () => {
    fetch = mockFetch(routes({ path: '/objects/predio/workflow', status: 404, body: { title: 'Not Found' } }))
    await openStoredRule()

    const statePicker = await screen.findByLabelText('Estado de destino')
    expect(
      within(statePicker)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual([''])

    await userEvent.click(screen.getByRole('button', { name: 'Guardar regla' }))
    await vi.waitFor(() => expect(fetch?.calls.some((call) => call.method === 'PUT')).toBe(true))
    const put = fetch.calls.find((call) => call.method === 'PUT')
    expect(put?.path).toBe('/objects/predio/automations/marca-revisado')
    expect(put?.body).toEqual({ name: 'marca-revisado', label: 'Marca revisado', enabled: true, definition: stored.definition })

    await userEvent.selectOptions(screen.getByLabelText('Cuándo'), 'TRANSITION_APPLIED')
    const transitionPicker = await screen.findByLabelText('Transición')
    expect(
      within(transitionPicker)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['', 'Cualquier transición'])
    // a 404 is an answer: asked once, never again
    expect(fetch.calls.filter((call) => call.path === '/objects/predio/workflow')).toHaveLength(1)
  })

  it('offers the workflow states and transitions when the object has one', async () => {
    fetch = mockFetch(routes({ path: '/objects/predio/workflow', body: workflow }))
    await openStoredRule()

    const statePicker = await screen.findByLabelText('Estado de destino')
    expect(await within(statePicker).findByRole('option', { name: 'Aprobado' })).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Cuándo'), 'TRANSITION_APPLIED')
    const transitionPicker = await screen.findByLabelText('Transición')
    expect(within(transitionPicker).getByRole('option', { name: 'Aprobar' })).toBeInTheDocument()
  })
})
