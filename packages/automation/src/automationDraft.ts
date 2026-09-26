import type { AutomationAction, AutomationPayload, AutomationProblem, ConditionOperator, RunStatus, TriggerType } from './types'

// the server validates all of this too. doing it here first keeps the admin out of a round trip.
const NAME = /^[a-z][a-z0-9_-]{0,48}$/
const VALUELESS: ConditionOperator[] = ['IS_EMPTY', 'IS_NOT_EMPTY', 'CHANGED']

export function operatorNeedsValue(operator: ConditionOperator): boolean {
  return !VALUELESS.includes(operator)
}

export function triggerNeedsState(type: TriggerType): boolean {
  return type === 'STATE_ENTERED'
}

export function triggerNeedsTransition(type: TriggerType): boolean {
  return type === 'TRANSITION_APPLIED'
}

export function starterAutomation(label: string): AutomationPayload {
  return {
    name: 'nueva-regla',
    label,
    enabled: true,
    definition: {
      trigger: { type: 'RECORD_CREATED' },
      conditions: [],
      actions: [{ type: 'UPDATE_FIELD', field: '', value: '' }]
    }
  }
}

export function emptyAction(type: AutomationAction['type']): AutomationAction {
  if (type === 'CREATE_RECORD') return { type, targetObject: '', values: {} }
  if (type === 'WEBHOOK') return { type, url: '' }
  if (type === 'GENERATE_DOCUMENT') return { type, documentType: '' }
  return { type, field: '', value: '' }
}

export function validateAutomation(payload: AutomationPayload): AutomationProblem[] {
  const problems: AutomationProblem[] = []
  if (!payload.name.trim()) problems.push({ field: 'name', code: 'NO_NAME' })
  else if (!NAME.test(payload.name.trim())) problems.push({ field: 'name', code: 'BAD_NAME', value: payload.name })

  const { trigger, conditions, actions } = payload.definition
  if (triggerNeedsState(trigger.type) && !trigger.state?.trim()) problems.push({ field: 'trigger', code: 'NO_STATE' })
  if (actions.length === 0) problems.push({ field: 'actions', code: 'NO_ACTIONS' })

  conditions.forEach((condition) => {
    if (operatorNeedsValue(condition.operator) && !condition.value?.trim()) {
      problems.push({ field: 'conditions', code: 'NO_CONDITION_VALUE', value: condition.field })
    }
  })

  actions.forEach((action) => {
    if (action.type === 'UPDATE_FIELD' && !action.field?.trim()) problems.push({ field: 'actions', code: 'NO_ACTION_FIELD' })
    if (action.type === 'CREATE_RECORD' && !action.targetObject?.trim()) problems.push({ field: 'actions', code: 'NO_TARGET' })
    if (action.type === 'WEBHOOK' && !action.url?.trim()) problems.push({ field: 'actions', code: 'NO_URL' })
    if (action.type === 'GENERATE_DOCUMENT' && !action.documentType?.trim()) problems.push({ field: 'actions', code: 'NO_DOCUMENT_TYPE' })
  })

  return problems
}

// a run the admin has to act on must not look like one that worked
export function statusTone(status: RunStatus): 'success' | 'danger' | 'muted' {
  if (status === 'SUCCEEDED') return 'success'
  if (status === 'FAILED') return 'danger'
  return 'muted'
}
