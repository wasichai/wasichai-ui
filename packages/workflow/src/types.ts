// workflow shapes. mirrors the /api/objects/{object}/workflow contract.
import type { RecordItem } from '@wasichai/core'

export type StateType = 'INITIAL' | 'INTERMEDIATE' | 'FINAL'

export interface WorkflowState {
  name: string
  label: string
  type: StateType
  // where the editor put the box. absent means nobody placed it yet.
  x?: number | null
  y?: number | null
}

// empty roles means anyone who may update the record
export interface WorkflowTransition {
  name: string
  label: string
  from: string
  to: string
  roles: string[]
}

export interface WorkflowDefinition {
  states: WorkflowState[]
  transitions: WorkflowTransition[]
}

export interface Workflow {
  id: string
  objectName: string
  name: string
  label: string
  enabled: boolean
  definition: WorkflowDefinition
}

// what the server sends on PUT: no id, the object owns at most one workflow
export interface WorkflowPayload {
  name: string
  label: string
  enabled: boolean
  definition: WorkflowDefinition
}

// every transition leaving the current state, allowed or not, so the UI can explain why
export interface AvailableTransition {
  name: string
  label: string
  to: string
  toLabel: string
  allowed: boolean
  reason: string | null
}

// records carry their state once the object has a workflow. metadata.ts stays untouched.
export type RecordWithState = RecordItem & { state?: string | null }

// what the client checks before hitting PUT. `field` mirrors ApiError violations.
export interface DefinitionProblem {
  field: string
  code: 'NO_INITIAL' | 'MANY_INITIAL' | 'DUPLICATE_STATE' | 'DUPLICATE_TRANSITION' | 'UNKNOWN_FROM' | 'UNKNOWN_TO' | 'NO_STATES'
  value?: string
}
