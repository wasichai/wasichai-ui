import type { DefinitionProblem, WorkflowDefinition, WorkflowState, WorkflowTransition } from './types'

// pure helpers over a workflow definition. no react, no fetch: the canvas, the inspector
// and the panel all reason about the graph, and the tests only need these.

// name -> label, falling back to the raw name for a state the definition no longer has
export function stateLabel(states: WorkflowState[], name: string | null | undefined, fallback = ''): string {
  if (!name) return fallback
  return states.find((state) => state.name === name)?.label || name
}

export function findState(states: WorkflowState[], name: string | null | undefined) {
  if (!name) return undefined
  return states.find((state) => state.name === name)
}

// what can leave this state. a transition pointing at a deleted state still shows up:
// hiding it would hide the problem.
export function outgoingTransitions(definition: WorkflowDefinition, stateName: string): WorkflowTransition[] {
  return definition.transitions.filter((transition) => transition.from === stateName)
}

// the one state a new record starts in
export function initialState(states: WorkflowState[]): WorkflowState | undefined {
  return states.find((state) => state.type === 'INITIAL')
}

// client-side gate before PUT. the server validates too; this just spares a round trip.
export function validateDefinition(definition: WorkflowDefinition): DefinitionProblem[] {
  const problems: DefinitionProblem[] = []
  const { states, transitions } = definition

  if (states.length === 0) problems.push({ field: 'states', code: 'NO_STATES' })

  const initials = states.filter((state) => state.type === 'INITIAL')
  if (states.length > 0 && initials.length === 0) {
    problems.push({ field: 'states', code: 'NO_INITIAL' })
  }
  if (initials.length > 1) problems.push({ field: 'states', code: 'MANY_INITIAL' })

  duplicates(states.map((state) => state.name)).forEach((name) => problems.push({ field: 'states', code: 'DUPLICATE_STATE', value: name }))
  duplicates(transitions.map((transition) => transition.name)).forEach((name) =>
    problems.push({ field: 'transitions', code: 'DUPLICATE_TRANSITION', value: name })
  )

  const known = new Set(states.map((state) => state.name))
  transitions.forEach((transition) => {
    if (!known.has(transition.from)) {
      problems.push({ field: 'transitions', code: 'UNKNOWN_FROM', value: transition.name })
    }
    if (!known.has(transition.to)) {
      problems.push({ field: 'transitions', code: 'UNKNOWN_TO', value: transition.name })
    }
  })

  return problems
}

// blank names count once: they are their own problem, not a duplicate pile
function duplicates(names: string[]): string[] {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  names.forEach((name) => {
    if (!name) return
    if (seen.has(name)) repeated.add(name)
    seen.add(name)
  })
  return [...repeated]
}

// one colour per state type: start is neutral-brand, in-flight is plain, final reads as done.
// the fallback covers a record parked on a state the definition dropped.
export function stateTone(type: StateTypeOrNull): string {
  switch (type) {
    case 'INITIAL':
      return 'bg-brand-soft text-brand-strong'
    case 'INTERMEDIATE':
      return 'bg-surface-muted text-ink'
    case 'FINAL':
      return 'bg-success/15 text-success'
    default:
      return 'bg-danger/15 text-danger'
  }
}

type StateTypeOrNull = WorkflowState['type'] | undefined | null

// something to edit instead of an empty form: the shape most approval flows start from.
// labels come in translated, they are data the user will rewrite anyway.
export function starterDefinition(labels: {
  draft: string
  review: string
  approved: string
  rejected: string
  send: string
  approve: string
  reject: string
}): WorkflowDefinition {
  return {
    states: [
      { name: 'draft', label: labels.draft, type: 'INITIAL' },
      { name: 'review', label: labels.review, type: 'INTERMEDIATE' },
      { name: 'approved', label: labels.approved, type: 'FINAL' },
      { name: 'rejected', label: labels.rejected, type: 'FINAL' }
    ],
    transitions: [
      { name: 'send', label: labels.send, from: 'draft', to: 'review', roles: [] },
      { name: 'approve', label: labels.approve, from: 'review', to: 'approved', roles: [] },
      { name: 'reject', label: labels.reject, from: 'review', to: 'rejected', roles: [] }
    ]
  }
}

export interface XY {
  x: number
  y: number
}

// one column per hop from the initial state, one row per state in that column.
// the numbers are just pixels that read well at the default zoom.
const COLUMN = 260
const ROW = 130
const ORIGIN: XY = { x: 40, y: 40 }

// where every state goes. a state that already carries x/y keeps them: the admin placed
// it on purpose. the rest get laid out by distance from the start, and whatever the walk
// never reaches lands in a column of its own rather than on top of the origin.
export function layoutStates(definition: WorkflowDefinition): Record<string, XY> {
  const { states } = definition
  const placed: Record<string, XY> = {}
  states.forEach((state) => {
    if (typeof state.x === 'number' && typeof state.y === 'number') placed[state.name] = { x: state.x, y: state.y }
  })

  const depth = depthByState(definition)
  const orphanColumn = Math.max(-1, ...Object.values(depth)) + 1
  const rows: Record<number, number> = {}

  // definition order, not traversal order: two runs must agree on the picture
  states.forEach((state) => {
    if (placed[state.name]) return
    const column = depth[state.name] ?? orphanColumn
    const row = rows[column] ?? 0
    rows[column] = row + 1
    placed[state.name] = { x: ORIGIN.x + column * COLUMN, y: ORIGIN.y + row * ROW }
  })

  return placed
}

// hops from the initial state, following transitions forward. unreached states are absent.
function depthByState(definition: WorkflowDefinition): Record<string, number> {
  const start = initialState(definition.states)
  if (!start) return {}
  const depth: Record<string, number> = { [start.name]: 0 }
  const queue = [start.name]
  while (queue.length > 0) {
    const current = queue.shift() as string
    outgoingTransitions(definition, current).forEach((transition) => {
      if (transition.to in depth) return
      depth[transition.to] = depth[current] + 1
      queue.push(transition.to)
    })
  }
  return depth
}

// what the canvas draws. positions come in already resolved so this stays pure.
export function toFlow(definition: WorkflowDefinition, positions: Record<string, XY>) {
  const nodes = definition.states.map((state) => ({
    id: state.name,
    type: 'state',
    position: positions[state.name] ?? ORIGIN,
    data: { state }
  }))
  const edges = definition.transitions.map((transition) => ({
    id: transition.name,
    source: transition.from,
    target: transition.to,
    label: transition.label || transition.name,
    // a transition pointing at a state that is gone still shows, in the colour of a problem
    style: known(definition, transition) ? undefined : { stroke: 'var(--color-danger)' }
  }))
  return { nodes, edges }
}

function known(definition: WorkflowDefinition, transition: WorkflowTransition): boolean {
  const names = new Set(definition.states.map((state) => state.name))
  return names.has(transition.from) && names.has(transition.to)
}

export interface ConnectionRefusal {
  code: 'FINAL_HAS_EXIT' | 'UNKNOWN_STATE'
  value?: string
}

// the gate before drawing an edge. the server refuses these too, so refusing here is not
// a second opinion, it is the same one delivered before the round trip.
export function refuseConnection(definition: WorkflowDefinition, from: string, to: string): ConnectionRefusal | null {
  const source = findState(definition.states, from)
  if (!source) return { code: 'UNKNOWN_STATE', value: from }
  if (!findState(definition.states, to)) return { code: 'UNKNOWN_STATE', value: to }
  // a FINAL state is final. a way out of it makes the type a lie.
  if (source.type === 'FINAL') return { code: 'FINAL_HAS_EXIT', value: source.label || source.name }
  return null
}

// coordinates go to the server rounded: the json does not need sixteen decimals. the list is
// reordered to match the picture, because a canvas has no up/down buttons and the stored order
// is read elsewhere — the automation builder lists states in it.
export function withPositions(definition: WorkflowDefinition, positions: Record<string, XY>): WorkflowDefinition {
  const placed = definition.states.map((state) => {
    const at = positions[state.name]
    return at ? { ...state, x: Math.round(at.x), y: Math.round(at.y) } : state
  })
  return { ...definition, states: [...placed].sort(readingOrder) }
}

// left to right, then top to bottom. a state nobody placed sorts last rather than anywhere.
function readingOrder(a: WorkflowState, b: WorkflowState): number {
  const ax = typeof a.x === 'number' ? a.x : Infinity
  const bx = typeof b.x === 'number' ? b.x : Infinity
  if (ax !== bx) return ax - bx
  return (typeof a.y === 'number' ? a.y : Infinity) - (typeof b.y === 'number' ? b.y : Infinity)
}

// state_1, state_2 … whatever is free
export function uniqueName(base: string, taken: string[]): string {
  let index = taken.length + 1
  while (taken.includes(`${base}_${index}`)) index += 1
  return `${base}_${index}`
}
