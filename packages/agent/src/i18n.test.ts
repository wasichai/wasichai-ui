import { describe, expect, it } from 'vitest'
import { agentMessages } from './i18n'

function leaves(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? leaves(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]
    )
    .sort()
}

describe('agent messages', () => {
  it('has the same keys in spanish and english', () => {
    expect(leaves(agentMessages.en)).toEqual(leaves(agentMessages.es))
  })

  it('names its nav entry and the strings the page draws', () => {
    expect(leaves(agentMessages.es)).toEqual(
      expect.arrayContaining(['nav.assistant', 'assistant.title', 'assistant.send', 'assistant.showSteps', 'assistant.disabledHint'])
    )
  })

  it('carries no sapgis name', () => {
    expect(JSON.stringify(agentMessages)).not.toMatch(/sapgis/i)
  })
})
