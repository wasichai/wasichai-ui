import { describe, expect, it } from 'vitest'
import { automationMessages } from './i18n'

function leaves(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? leaves(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]
    )
    .sort()
}

describe('automation messages', () => {
  it('has the same keys in spanish and english', () => {
    expect(leaves(automationMessages.en)).toEqual(leaves(automationMessages.es))
  })

  it('names its nav entries', () => {
    expect(leaves(automationMessages.es)).toEqual(expect.arrayContaining(['nav.rules', 'nav.runs', 'automations.title', 'automations.runsTitle']))
  })
})
