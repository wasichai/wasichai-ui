import { describe, expect, it } from 'vitest'
import { gisMessages } from './i18n'

function leaves(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? leaves(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]
    )
    .sort()
}

describe('gis messages', () => {
  it('has the same keys in spanish and english', () => {
    expect(leaves(gisMessages.en)).toEqual(leaves(gisMessages.es))
  })

  it('names its nav entries', () => {
    expect(leaves(gisMessages.es)).toEqual(
      expect.arrayContaining([
        'nav.gis',
        'nav.maps',
        'nav.layers',
        'nav.mapViews',
        'pages.types.MAP',
        'objects.geometry',
        'history.geometryUpdated',
        'history.geometry'
      ])
    )
  })
})
