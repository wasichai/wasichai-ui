import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkflowPanel } from './WorkflowPanel'
import { ApiError, coreModule, writePolicy, type WritePolicy } from '@wasichai/core'
import type { ReactElement } from 'react'
import { renderWithProviders as renderBase } from '@wasichai/testing'
import { workflowModule } from './module'
import type { AvailableTransition, RecordWithState, Workflow } from './types'

// the panel's strings live in the workflow namespace. core declares the 'automation' nav group
// workflowModule's nav item points at, and createRegistry validates that eagerly
const renderWithProviders = (ui: ReactElement) => renderBase(ui, { modules: [coreModule, workflowModule()] })

// the mock factories run at import time, so the mutable fixture has to be hoisted with them
const { state } = vi.hoisted(() => ({
  state: {
    workflow: null as Workflow | null,
    transitions: [] as AvailableTransition[],
    record: null as RecordWithState | null,
    apply: vi.fn(),
    pending: false,
    policy: null as WritePolicy | null,
    error: null as unknown
  }
}))

vi.mock('./api', () => ({
  useWorkflow: () => ({ data: state.workflow, isLoading: false, isError: !state.workflow }),
  useAvailableTransitions: () => ({ data: state.transitions, isLoading: false, isError: false }),
  useApplyTransition: () => ({
    mutateAsync: state.apply,
    isPending: state.pending,
    error: state.error
  })
}))

vi.mock('@wasichai/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/core')>()),
  useRecord: () => ({ data: state.record }),
  useWritePolicy: () => state.policy
}))

const workflow: Workflow = {
  id: 'wf-1',
  objectName: 'predio',
  name: 'approval',
  label: 'Aprobación',
  enabled: true,
  definition: {
    states: [
      { name: 'draft', label: 'Borrador', type: 'INITIAL' },
      { name: 'review', label: 'En revisión', type: 'INTERMEDIATE' },
      { name: 'approved', label: 'Aprobado', type: 'FINAL' }
    ],
    transitions: [
      { name: 'send', label: 'Enviar a revisión', from: 'draft', to: 'review', roles: [] },
      { name: 'approve', label: 'Aprobar', from: 'review', to: 'approved', roles: ['ADMIN'] }
    ]
  }
}

const record: RecordWithState = {
  id: 'r-1',
  createdAt: null,
  updatedAt: null,
  attributes: {},
  geometries: {},
  state: 'review'
}

beforeEach(() => {
  state.workflow = workflow
  state.record = record
  state.transitions = [
    {
      name: 'approve',
      label: 'Aprobar',
      to: 'approved',
      toLabel: 'Aprobado',
      allowed: true,
      reason: null
    },
    {
      name: 'reject',
      label: 'Rechazar',
      to: 'rejected',
      toLabel: 'Rechazado',
      allowed: false,
      reason: 'Necesitas el rol SUPERVISOR'
    }
  ]
  state.apply = vi.fn(async () => undefined)
  state.pending = false
  state.policy = writePolicy({})
  state.error = null
})

describe('WorkflowPanel', () => {
  it('shows the label of the state the record is in', () => {
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)
    expect(screen.getByTestId('workflow-state')).toHaveTextContent('En revisión')
  })

  it('falls back to a placeholder when the record has no state yet', () => {
    state.record = { ...record, state: null }
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)
    expect(screen.getByTestId('workflow-state')).toHaveTextContent('Sin estado')
  })

  it('disables a transition that is not allowed and says why', () => {
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)
    expect(screen.getByRole('button', { name: /Rechazar/ })).toBeDisabled()
    expect(screen.getByText('Necesitas el rol SUPERVISOR')).toBeInTheDocument()
  })

  it('applies the transition the button names', async () => {
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)
    await userEvent.click(screen.getByRole('button', { name: /Aprobar/ }))
    expect(state.apply).toHaveBeenCalledWith({ name: 'approve' })
  })

  it('asks for a reason on a requiresReason object, and sends nothing when cancelled', async () => {
    state.policy = writePolicy({ requiresReason: true })
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)

    await userEvent.click(screen.getByRole('button', { name: /Aprobar/ }))
    expect(screen.getByRole('dialog', { name: 'Aprobar' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(state.apply).not.toHaveBeenCalled()
  })

  it('applies with the typed reason', async () => {
    state.policy = writePolicy({ requiresReason: true })
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)

    await userEvent.click(screen.getByRole('button', { name: /Aprobar/ }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Motivo'), 'listo')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Aprobar' }))

    expect(state.apply).toHaveBeenCalledWith({ name: 'approve', reason: 'listo' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('offers no transition on an append-only object and says why', () => {
    state.policy = writePolicy({ appendOnly: true })
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)

    expect(screen.getByRole('button', { name: /Aprobar/ })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Los registros de este objeto solo se crean: no se editan ni se eliminan.')
  })

  it('holds the transitions until the object rules arrive', () => {
    state.policy = { ...writePolicy({}), loaded: false }
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)
    expect(screen.getByRole('button', { name: /Aprobar/ })).toBeDisabled()
  })

  it('still moves records of an api-only object', async () => {
    state.policy = writePolicy({ apiOnly: true })
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)

    await userEvent.click(screen.getByRole('button', { name: /Aprobar/ }))
    expect(state.apply).toHaveBeenCalledWith({ name: 'approve' })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('renders nothing when the object has no workflow', () => {
    state.workflow = null
    const { container } = renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the workflow is switched off', () => {
    state.workflow = { ...workflow, enabled: false }
    const { container } = renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows what the server says when the record moved underneath you', () => {
    state.error = new ApiError(409, 'El registro ya no está en revisión')
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)
    expect(screen.getByText('El registro ya no está en revisión')).toBeInTheDocument()
  })

  it('says nothing leaves a final state', () => {
    state.transitions = []
    renderWithProviders(<WorkflowPanel objectName="predio" recordId="r-1" />)
    expect(screen.getByText('No hay transiciones desde este estado')).toBeInTheDocument()
  })
})
