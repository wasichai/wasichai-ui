import { describe, expect, it } from 'vitest'
import { emptyAction, operatorNeedsValue, starterAutomation, statusTone, triggerNeedsState, validateAutomation } from './automationDraft'
import type { AutomationPayload } from './types'

const base = (): AutomationPayload => starterAutomation('Regla')

describe('automation draft', () => {
  it('accepts the starter once its action names a field', () => {
    const draft = base()
    expect(validateAutomation(draft).map((problem) => problem.code)).toEqual(['NO_ACTION_FIELD'])
    draft.definition.actions[0].field = 'revisado'
    expect(validateAutomation(draft)).toEqual([])
  })

  it('refuses a name the server would refuse', () => {
    const draft = base()
    draft.definition.actions[0].field = 'revisado'
    draft.name = 'Regla Nueva'
    expect(validateAutomation(draft)[0]).toMatchObject({ code: 'BAD_NAME', field: 'name' })
    draft.name = ''
    expect(validateAutomation(draft)[0]).toMatchObject({ code: 'NO_NAME' })
  })

  it('asks for a state only when the trigger is about states', () => {
    const draft = base()
    draft.definition.actions[0].field = 'revisado'
    draft.definition.trigger = { type: 'STATE_ENTERED' }
    expect(validateAutomation(draft).map((problem) => problem.code)).toContain('NO_STATE')
    draft.definition.trigger = { type: 'STATE_ENTERED', state: 'aprobado' }
    expect(validateAutomation(draft)).toEqual([])
    expect(triggerNeedsState('RECORD_CREATED')).toBe(false)
  })

  it('asks for a value only for the operators that compare against one', () => {
    expect(operatorNeedsValue('EQUALS')).toBe(true)
    expect(operatorNeedsValue('CHANGED')).toBe(false)
    const draft = base()
    draft.definition.actions[0].field = 'revisado'
    draft.definition.conditions = [{ field: 'area', operator: 'GREATER_THAN', value: '' }]
    expect(validateAutomation(draft)[0]).toMatchObject({ code: 'NO_CONDITION_VALUE', value: 'area' })
    draft.definition.conditions = [{ field: 'area', operator: 'CHANGED' }]
    expect(validateAutomation(draft)).toEqual([])
  })

  it('each action type asks for what it needs', () => {
    const draft = base()
    draft.definition.actions = [emptyAction('CREATE_RECORD')]
    expect(validateAutomation(draft)[0]).toMatchObject({ code: 'NO_TARGET' })
    draft.definition.actions = [emptyAction('WEBHOOK')]
    expect(validateAutomation(draft)[0]).toMatchObject({ code: 'NO_URL' })
    draft.definition.actions = []
    expect(validateAutomation(draft)[0]).toMatchObject({ code: 'NO_ACTIONS' })
  })

  it('a failed run never looks like one that worked', () => {
    expect(statusTone('SUCCEEDED')).toBe('success')
    expect(statusTone('FAILED')).toBe('danger')
    expect(statusTone('SKIPPED')).toBe('muted')
  })
})
