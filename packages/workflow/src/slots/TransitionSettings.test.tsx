import type { ReactNode } from 'react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { coreModule, type ObjectDefinition, type PageComponent } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { workflowModule } from '../module'
import { TransitionSettings } from './TransitionSettings'

vi.mock('@wasichai/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/ui')>()),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => <option value={value}>{children}</option>,
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children?: ReactNode }) => (
    <select aria-label="transición" value={value} onChange={(event) => onValueChange(event.target.value)}>
      <option value="" />
      {children}
    </select>
  )
}))

const definition: ObjectDefinition = { id: 'o1', name: 'predio', label: 'Predio', pluralLabel: 'Predios', description: null, enabled: true, fields: [] }
const component: PageComponent = {
  type: 'ACTION',
  column: 1,
  title: null,
  layout: 'single-column',
  children: [],
  relationship: null,
  fields: null,
  content: null,
  action: 'TRANSITION'
}

function workflow(enabled: boolean) {
  return {
    id: 'wf-1',
    objectName: 'predio',
    name: 'approval',
    label: 'Aprobación',
    enabled,
    definition: {
      states: [
        { name: 'draft', label: 'Borrador', type: 'INITIAL' },
        { name: 'review', label: 'En revisión', type: 'FINAL' }
      ],
      transitions: [
        { name: 'send', label: 'Enviar', from: 'draft', to: 'review', roles: [] },
        { name: 'approve', label: 'Aprobar', from: 'review', to: 'review', roles: [] }
      ]
    }
  }
}

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

function draw(onChange = vi.fn()) {
  // core declares the 'automation' nav group workflowModule's nav item points at; createRegistry
  // validates that eagerly, so it must be in the array even though this test never draws the sidebar
  const result = renderWithProviders(<TransitionSettings component={component} definition={definition} objectName="predio" onChange={onChange} />, {
    modules: [coreModule, workflowModule()]
  })
  const settled = () => waitFor(() => expect(result.queryClient.getQueryState(['workflow', 'predio'])?.status).not.toBe('pending'))
  return { onChange, settled }
}

const offered = () =>
  within(screen.getByLabelText('transición'))
    .getAllByRole('option')
    .map((option) => option.getAttribute('value'))

describe('TRANSITION settings', () => {
  it('offers the transitions of an enabled workflow and hands the pick back', async () => {
    fetch = mockFetch([{ path: '/objects/predio/workflow', body: workflow(true) }])
    const { onChange } = draw()

    await screen.findByRole('option', { name: 'approve' })
    expect(offered()).toEqual(['', 'send', 'approve'])
    await userEvent.selectOptions(screen.getByLabelText('transición'), 'approve')
    expect(onChange).toHaveBeenCalledWith({ transition: 'approve' })
    expect(screen.getByText('Transición')).toBeInTheDocument()
  })

  it('offers nothing while the workflow is switched off: the server would refuse every one', async () => {
    fetch = mockFetch([{ path: '/objects/predio/workflow', body: workflow(false) }])
    const { settled } = draw()

    await settled()
    expect(offered()).toEqual([''])
  })

  it('offers nothing for an object without a workflow, and does not retry the 404', async () => {
    fetch = mockFetch([])
    const { settled } = draw()

    await settled()
    expect(offered()).toEqual([''])
    expect(fetch.calls.filter((call) => call.path === '/objects/predio/workflow')).toHaveLength(1)
  })
})
