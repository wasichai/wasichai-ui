import { describe, expect, it } from 'vitest'
import {
  initialState,
  layoutStates,
  outgoingTransitions,
  refuseConnection,
  starterDefinition,
  stateLabel,
  toFlow,
  uniqueName,
  validateDefinition,
  withPositions
} from './workflowGraph'
import type { WorkflowDefinition } from './types'

const starterLabels = {
  draft: 'Borrador',
  review: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  send: 'Enviar',
  approve: 'Aprobar',
  reject: 'Rechazar'
}

function definition(patch: Partial<WorkflowDefinition> = {}): WorkflowDefinition {
  return { ...starterDefinition(starterLabels), ...patch }
}

describe('validateDefinition', () => {
  it('accepts the starting point the builder offers', () => {
    expect(validateDefinition(definition())).toEqual([])
  })

  it('complains when nothing is the initial state', () => {
    const states = definition().states.map((state) => (state.type === 'INITIAL' ? { ...state, type: 'INTERMEDIATE' as const } : state))
    expect(validateDefinition(definition({ states }))).toEqual([{ field: 'states', code: 'NO_INITIAL' }])
  })

  it('complains when two states claim to be the initial one', () => {
    const states = definition().states.map((state) => (state.name === 'review' ? { ...state, type: 'INITIAL' as const } : state))
    expect(validateDefinition(definition({ states }))).toContainEqual({
      field: 'states',
      code: 'MANY_INITIAL'
    })
  })

  it('reports an empty definition once', () => {
    expect(validateDefinition({ states: [], transitions: [] })).toEqual([{ field: 'states', code: 'NO_STATES' }])
  })

  it('reports duplicate state and transition names', () => {
    const base = definition()
    const problems = validateDefinition({
      states: [...base.states, { name: 'review', label: 'Otra', type: 'INTERMEDIATE' }],
      transitions: [...base.transitions, { ...base.transitions[0], from: 'review' }]
    })
    expect(problems).toContainEqual({ field: 'states', code: 'DUPLICATE_STATE', value: 'review' })
    expect(problems).toContainEqual({
      field: 'transitions',
      code: 'DUPLICATE_TRANSITION',
      value: 'send'
    })
  })

  it('reports transitions that point at states nobody defined', () => {
    const base = definition()
    const problems = validateDefinition({
      states: base.states,
      transitions: [{ name: 'archive', label: 'Archivar', from: 'ghost', to: 'void', roles: [] }]
    })
    expect(problems).toContainEqual({
      field: 'transitions',
      code: 'UNKNOWN_FROM',
      value: 'archive'
    })
    expect(problems).toContainEqual({ field: 'transitions', code: 'UNKNOWN_TO', value: 'archive' })
  })
})

describe('outgoingTransitions', () => {
  it('lists what leaves a state, in definition order', () => {
    const base = definition()
    expect(outgoingTransitions(base, 'review').map((transition) => transition.name)).toEqual(['approve', 'reject'])
  })

  it('returns nothing for a final state', () => {
    expect(outgoingTransitions(definition(), 'approved')).toEqual([])
  })
})

describe('stateLabel', () => {
  it('resolves a state name to its label', () => {
    expect(stateLabel(definition().states, 'review')).toBe('En revisión')
  })

  it('falls back to the raw name for a state that no longer exists', () => {
    expect(stateLabel(definition().states, 'archived')).toBe('archived')
  })

  it('uses the given fallback when the record has no state at all', () => {
    expect(stateLabel(definition().states, null, 'Sin estado')).toBe('Sin estado')
  })
})

describe('initialState', () => {
  it('finds where a new record starts', () => {
    expect(initialState(definition().states)?.name).toBe('draft')
  })
})

describe('layoutStates', () => {
  it('walks forward from the initial state, a column per hop', () => {
    const placed = layoutStates(definition())
    // draft -> review -> {approved, rejected}
    expect(placed.draft.x).toBeLessThan(placed.review.x)
    expect(placed.review.x).toBeLessThan(placed.approved.x)
    expect(placed.approved.x).toBe(placed.rejected.x)
    expect(placed.approved.y).not.toBe(placed.rejected.y)
  })

  it('places a state nothing reaches instead of stacking it on the origin', () => {
    const base = definition()
    const states = [...base.states, { name: 'orphan', label: 'Huérfano', type: 'INTERMEDIATE' as const }]
    const placed = layoutStates({ ...base, states })
    expect(placed.orphan).toBeDefined()
    expect(placed.orphan).not.toEqual(placed.draft)
  })

  it('leaves alone a state the admin placed by hand', () => {
    const base = definition()
    const states = base.states.map((state) => (state.name === 'review' ? { ...state, x: 999, y: 777 } : state))
    expect(layoutStates({ ...base, states }).review).toEqual({ x: 999, y: 777 })
  })

  it('agrees with itself across runs', () => {
    expect(layoutStates(definition())).toEqual(layoutStates(definition()))
  })

  it('places every state even when none is the initial one', () => {
    const states = definition().states.map((state) => ({ ...state, type: 'INTERMEDIATE' as const }))
    const placed = layoutStates({ ...definition(), states })
    expect(Object.keys(placed).sort()).toEqual(['approved', 'draft', 'rejected', 'review'])
  })
})

describe('refuseConnection', () => {
  it('lets an intermediate state reach another one', () => {
    expect(refuseConnection(definition(), 'draft', 'approved')).toBeNull()
  })

  it('refuses a way out of a final state, and names it', () => {
    expect(refuseConnection(definition(), 'approved', 'draft')).toEqual({ code: 'FINAL_HAS_EXIT', value: 'Aprobado' })
  })

  it('refuses a state that is not there', () => {
    expect(refuseConnection(definition(), 'draft', 'ghost')).toEqual({ code: 'UNKNOWN_STATE', value: 'ghost' })
  })

  it('allows a second way between the same two states', () => {
    expect(refuseConnection(definition(), 'draft', 'review')).toBeNull()
  })
})

describe('withPositions', () => {
  it('writes whole pixels onto the states and changes nothing else', () => {
    const base = definition()
    const placed = withPositions(base, { draft: { x: 10.4, y: 20.6 } })
    expect(placed.states[0]).toEqual({ ...base.states[0], x: 10, y: 21 })
    expect(placed.transitions).toEqual(base.transitions)
  })

  it('leaves a state nobody placed without coordinates', () => {
    expect(withPositions(definition(), {}).states[0].x).toBeUndefined()
  })

  // a canvas has no up/down buttons, so the picture is what orders the list
  it('reorders the states to read left to right, then top to bottom', () => {
    const base = definition()
    const shuffled = { ...base, states: [...base.states].reverse() }
    const placed = withPositions(shuffled, {
      draft: { x: 40, y: 40 },
      review: { x: 300, y: 40 },
      approved: { x: 560, y: 40 },
      rejected: { x: 560, y: 170 }
    })
    expect(placed.states.map((state) => state.name)).toEqual(['draft', 'review', 'approved', 'rejected'])
  })

  it('puts the states nobody placed after the placed ones, in the order they came', () => {
    const base = definition()
    const states = [{ name: 'loose', label: 'Suelto', type: 'INTERMEDIATE' as const }, ...base.states]
    const placed = withPositions({ ...base, states }, { draft: { x: 40, y: 40 }, review: { x: 300, y: 40 } })
    expect(placed.states.map((state) => state.name)).toEqual(['draft', 'review', 'loose', 'approved', 'rejected'])
  })
})

describe('toFlow', () => {
  it('turns states into nodes and transitions into edges', () => {
    const { nodes, edges } = toFlow(definition(), layoutStates(definition()))
    expect(nodes.map((node) => node.id)).toEqual(['draft', 'review', 'approved', 'rejected'])
    expect(edges.map((edge) => edge.id)).toEqual(['send', 'approve', 'reject'])
    expect(edges[0]).toMatchObject({ source: 'draft', target: 'review', label: 'Enviar' })
  })

  it('marks an edge pointing at a state that is gone', () => {
    const base = definition()
    const states = base.states.filter((state) => state.name !== 'rejected')
    const { edges } = toFlow({ ...base, states }, {})
    expect(edges.find((edge) => edge.id === 'reject')?.style).toBeDefined()
    expect(edges.find((edge) => edge.id === 'send')?.style).toBeUndefined()
  })
})

describe('uniqueName', () => {
  it('skips the names already taken', () => {
    expect(uniqueName('state', ['state_1'])).toBe('state_2')
    expect(uniqueName('state', ['state_1', 'state_2'])).toBe('state_3')
  })
})
