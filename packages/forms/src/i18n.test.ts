import { describe, expect, it } from 'vitest'
import { formsMessages } from './i18n'

function leaves(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? leaves(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]
    )
    .sort()
}

describe('forms messages', () => {
  it('has the same keys in spanish and english', () => {
    expect(leaves(formsMessages.en)).toEqual(leaves(formsMessages.es))
  })

  it('names its nav entry and every string the builder draws', () => {
    expect(leaves(formsMessages.es)).toEqual(
      expect.arrayContaining(['nav.forms', 'forms.title', 'forms.pick', 'forms.addSection', 'forms.addField', 'forms.confirmReset'])
    )
  })
})
