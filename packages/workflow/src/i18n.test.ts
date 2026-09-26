import { describe, expect, it } from 'vitest'
import { workflowMessages } from './i18n'

function leaves(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? leaves(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]
    )
    .sort()
}

describe('workflow messages', () => {
  it('has the same keys in spanish and english', () => {
    expect(leaves(workflowMessages.en)).toEqual(leaves(workflowMessages.es))
  })

  it('names its nav entry and its builder slots', () => {
    expect(leaves(workflowMessages.es)).toEqual(
      expect.arrayContaining([
        'nav.workflows',
        'pageComponents.WORKFLOW',
        'pageActions.TRANSITION',
        'pages.transition',
        'pages.transitionGone',
        'pages.action',
        'pages.mockWorkflow.initialState'
      ])
    )
  })
})
