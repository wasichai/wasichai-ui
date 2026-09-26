import { describe, expect, it } from 'vitest'
import { viewsMessages } from './i18n'

function leaves(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? leaves(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]
    )
    .sort()
}

describe('views messages', () => {
  it('has the same keys in spanish and english', () => {
    expect(leaves(viewsMessages.en)).toEqual(leaves(viewsMessages.es))
  })

  it('names its nav entry and every string the builder draws', () => {
    expect(leaves(viewsMessages.es)).toEqual(
      expect.arrayContaining([
        'nav.views',
        'views.title',
        'views.pick',
        'views.addColumn',
        'views.directions.ASC',
        'views.directions.DESC',
        'views.confirmReset'
      ])
    )
  })
})
