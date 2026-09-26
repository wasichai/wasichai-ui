// automation shapes. mirrors the /api/objects/{object}/automations contract.

export type TriggerType = 'RECORD_CREATED' | 'RECORD_UPDATED' | 'RECORD_DELETED' | 'TRANSITION_APPLIED' | 'STATE_ENTERED'

export type ConditionOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IS_EMPTY' | 'IS_NOT_EMPTY' | 'CHANGED'

export type ActionType = 'UPDATE_FIELD' | 'CREATE_RECORD' | 'WEBHOOK' | 'GENERATE_DOCUMENT'

export type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED'

// transition and state only mean something to the trigger that names them
export interface AutomationTrigger {
  type: TriggerType
  transition?: string | null
  state?: string | null
}

export interface AutomationCondition {
  field: string
  operator: ConditionOperator
  value?: string | null
}

// one shape for every action, like the server's
export interface AutomationAction {
  type: ActionType
  field?: string | null
  value?: string | null
  targetObject?: string | null
  values?: Record<string, string>
  url?: string | null
  // GENERATE_DOCUMENT
  documentType?: string | null
}

export interface AutomationDefinition {
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
}

export interface Automation {
  id: string
  objectName: string
  name: string
  label: string
  enabled: boolean
  definition: AutomationDefinition
}

export interface AutomationPayload {
  name: string
  label: string
  enabled: boolean
  definition: AutomationDefinition
}

export interface RunStep {
  action: ActionType
  detail: string
}

export interface AutomationRun {
  id: string
  automation: string | null
  objectName: string
  recordId: string | null
  trigger: TriggerType
  status: RunStatus
  depth: number
  steps: RunStep[]
  error: string | null
  attempts: number
  createdAt: string | null
  finishedAt: string | null
}

// what the client checks before hitting the server. `field` mirrors ApiError violations.
export interface AutomationProblem {
  field: string
  code: 'NO_NAME' | 'BAD_NAME' | 'NO_ACTIONS' | 'NO_STATE' | 'NO_CONDITION_VALUE' | 'NO_ACTION_FIELD' | 'NO_TARGET' | 'NO_URL' | 'NO_DOCUMENT_TYPE'
  value?: string
}

// what a rule reads of the object's workflow: state and transition names for the trigger pickers.
// the full shape belongs to @wasichai/workflow, which this package never imports.
export interface WorkflowOutline {
  enabled: boolean
  definition: {
    states: { name: string; label: string }[]
    transitions: { name: string; label: string }[]
  }
}

// what GENERATE_DOCUMENT offers. the full shape belongs to @wasichai/documents
export interface DocumentTypeOption {
  id: string
  name: string
  label: string
}
