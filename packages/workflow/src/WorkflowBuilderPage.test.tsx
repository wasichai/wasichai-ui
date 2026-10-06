import { Children, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, coreModule } from '@wasichai/core'
import { renderWithProviders as renderBase } from '@wasichai/testing'
import { workflowModule } from './module'
import type { Workflow, WorkflowPayload } from './types'

// the panel's strings live in the workflow namespace. core declares the 'automation' nav group
// workflowModule's nav item points at, and createRegistry validates that eagerly
const renderWithProviders = (ui: ReactElement) => renderBase(ui, { modules: [coreModule, workflowModule()] })

// xyflow measures its container with a ResizeObserver and draws nothing when the container
// measures zero, which is all jsdom ever reports. so the canvas is a double: it records the
// props it was handed and lets the test fire the callbacks the pointer would have fired.
const { flow, state } = vi.hoisted(() => ({
  flow: { props: null as Record<string, never> | null },
  state: {
    workflow: null as Workflow | null,
    // what GET answered instead of a workflow: a 404 means there is none yet
    loadError: null as unknown,
    refetch: vi.fn(),
    save: vi.fn(),
    remove: vi.fn()
  }
}))

vi.mock('./WorkflowCanvas', () => ({
  WorkflowCanvas: (props: Record<string, never>) => {
    flow.props = props
    return <div data-testid="canvas" />
  }
}))

// radix opens its listbox in a portal behind pointer capture jsdom does not implement.
// a native select answers the same question: which value did the page receive.
vi.mock('@wasichai/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wasichai/ui')>()
  const SelectTrigger = ({ children }: { children?: ReactNode }) => <>{children}</>
  return {
    ...actual,
    SelectTrigger,
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => <option value={value}>{children}</option>,
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children?: ReactNode }) => (
      <select aria-label={triggerLabel(children)} value={value} onChange={(event) => onValueChange(event.target.value)}>
        <option value="" />
        {children}
      </select>
    )
  }

  // the accessible name lives on the trigger, which this double renders away
  function triggerLabel(children: ReactNode): string | undefined {
    const trigger = Children.toArray(children).find((child) => isValidElement(child) && child.type === SelectTrigger)
    return isValidElement(trigger) ? (trigger.props as { 'aria-label'?: string })['aria-label'] : undefined
  }
})

vi.mock('./api', () => ({
  useWorkflow: () => ({
    data: state.workflow ?? undefined,
    isLoading: false,
    isError: state.loadError !== null,
    error: state.loadError,
    refetch: state.refetch
  }),
  useSaveWorkflow: () => ({ mutateAsync: state.save, isPending: false }),
  useDeleteWorkflow: () => ({ mutateAsync: state.remove, isPending: false })
}))

vi.mock('@wasichai/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/core')>()),
  useObjects: () => ({ data: [{ id: 'o-1', name: 'predio', label: 'Predio' }] }),
  useRoles: () => ({ data: [{ name: 'SUPERVISOR', label: 'Supervisor' }] })
}))

const { WorkflowBuilderPage } = await import('./WorkflowBuilderPage')

const workflow: Workflow = {
  id: 'wf-1',
  objectName: 'predio',
  name: 'approval',
  label: 'Aprobación',
  enabled: true,
  definition: {
    states: [
      { name: 'draft', label: 'Borrador', type: 'INITIAL', x: 40, y: 40 },
      { name: 'review', label: 'En revisión', type: 'INTERMEDIATE', x: 300, y: 40 },
      { name: 'approved', label: 'Aprobado', type: 'FINAL', x: 560, y: 40 }
    ],
    transitions: [{ name: 'send', label: 'Enviar', from: 'draft', to: 'review', roles: [] }]
  }
}

// the page only builds a draft once an object is picked
async function open() {
  renderWithProviders(<WorkflowBuilderPage />)
  await userEvent.selectOptions(screen.getByLabelText('Objeto'), 'predio')
}

function canvas() {
  return flow.props as unknown as {
    definition: Workflow['definition']
    positions: Record<string, { x: number; y: number }>
    onSelectState: (name: string) => void
    onSelectTransition: (name: string) => void
    onMove: (name: string, at: { x: number; y: number }) => void
    onConnect: (from: string, to: string) => void
  }
}

function saved(): WorkflowPayload {
  return (state.save.mock.calls.at(-1)?.[0] as { payload: WorkflowPayload }).payload
}

beforeEach(() => {
  state.workflow = workflow
  state.loadError = null
  state.refetch = vi.fn()
  state.save = vi.fn()
  state.remove = vi.fn()
  flow.props = null
  vi.restoreAllMocks()
})

describe('WorkflowBuilderPage', () => {
  it('hands the canvas every state and transition of the stored workflow', async () => {
    await open()
    expect(canvas().definition.states.map((item) => item.name)).toEqual(['draft', 'review', 'approved'])
    expect(canvas().definition.transitions).toHaveLength(1)
  })

  it('shows the fields of the state the canvas selected', async () => {
    await open()
    act(() => canvas().onSelectState('review'))
    expect(screen.getByLabelText('Nombre')).toHaveValue('review')
    expect(screen.getByLabelText('Etiqueta')).toHaveValue('En revisión')
  })

  it('adds a transition when two states are connected, and opens it', async () => {
    await open()
    act(() => canvas().onConnect('review', 'approved'))
    expect(canvas().definition.transitions.map((item) => item.name)).toEqual(['send', 'transition_2'])
    expect(canvas().definition.transitions[1]).toMatchObject({ from: 'review', to: 'approved' })
    expect(screen.getByLabelText('Desde')).toHaveValue('review')
  })

  it('refuses a way out of a final state and says which one', async () => {
    await open()
    act(() => canvas().onConnect('approved', 'draft'))
    expect(canvas().definition.transitions).toHaveLength(1)
    expect(screen.getByText(/«Aprobado» es un estado final/)).toBeInTheDocument()
  })

  it('sends the coordinates a drag left behind', async () => {
    await open()
    act(() => canvas().onMove('draft', { x: 123.4, y: 456.7 }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar flujo' }))
    expect(saved().definition.states[0]).toMatchObject({ name: 'draft', x: 123, y: 457 })
  })

  it('places a workflow that was stored without coordinates', async () => {
    const states = workflow.definition.states.map(({ x: _x, y: _y, ...rest }) => rest)
    state.workflow = { ...workflow, definition: { ...workflow.definition, states } }
    await open()
    const placed = canvas().positions
    expect(placed.draft.x).toBeLessThan(placed.review.x)

    await userEvent.click(screen.getByRole('button', { name: 'Guardar flujo' }))
    expect(saved().definition.states[0].x).toBe(placed.draft.x)
  })

  it('demotes the old initial state when another one claims it', async () => {
    await open()
    act(() => canvas().onSelectState('review'))
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'INITIAL')
    const types = Object.fromEntries(canvas().definition.states.map((item) => [item.name, item.type]))
    expect(types).toMatchObject({ draft: 'INTERMEDIATE', review: 'INITIAL' })
  })

  it('drags the transitions along when a state is renamed', async () => {
    await open()
    act(() => canvas().onSelectState('review'))
    await userEvent.clear(screen.getByLabelText('Nombre'))
    await userEvent.type(screen.getByLabelText('Nombre'), 'revision')
    expect(canvas().definition.transitions[0].to).toBe('revision')
  })

  it('drops the transitions of a state it deletes', async () => {
    await open()
    act(() => canvas().onSelectState('draft'))
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar lo seleccionado' }))
    expect(canvas().definition.states.map((item) => item.name)).toEqual(['review', 'approved'])
    expect(canvas().definition.transitions).toHaveLength(0)
  })

  it('will not save a workflow with no initial state', async () => {
    await open()
    act(() => canvas().onSelectState('draft'))
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'INTERMEDIATE')
    expect(screen.getByTestId('workflow-problems')).toHaveTextContent('Falta el estado inicial')
    expect(screen.getByRole('button', { name: 'Guardar flujo' })).toBeDisabled()
  })

  it('asks before deleting the workflow, and drops nothing when told no', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar flujo' }))
    expect(state.remove).not.toHaveBeenCalled()
  })

  it('offers a starting point when the object has no workflow yet', async () => {
    state.workflow = null
    state.loadError = new ApiError(404, 'Not Found')
    await open()
    expect(canvas().definition.states.map((item) => item.name)).toEqual(['draft', 'review', 'approved', 'rejected'])
    expect(screen.queryByRole('button', { name: 'Eliminar flujo' })).not.toBeInTheDocument()
  })

  // a starter there would let Save put it over the workflow the server failed to send
  it('shows a failed load with a retry, and offers nothing to save', async () => {
    state.workflow = null
    state.loadError = new ApiError(500, 'Database unavailable')
    await open()
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar')
    expect(screen.getByRole('alert')).toHaveTextContent('Database unavailable')
    expect(flow.props).toBeNull()
    expect(screen.queryByRole('button', { name: 'Guardar flujo' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(state.refetch).toHaveBeenCalled()
  })

  // the workflow's own panel has a 'Nombre técnico' too: losing the selection would type into it
  it('keeps a transition open while its name is typed', async () => {
    await open()
    act(() => canvas().onSelectTransition('send'))
    await userEvent.clear(screen.getByLabelText('Nombre técnico'))
    await userEvent.type(screen.getByLabelText('Nombre técnico'), 'enviar')
    expect(canvas().definition.transitions[0].name).toBe('enviar')
    expect(screen.getByRole('heading', { name: 'Transición' })).toBeInTheDocument()
  })
})
