import { describe, expect, it } from 'vitest'
import { pagesMessages } from './i18n'

function leaves(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? leaves(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]
    )
    .sort()
}

describe('pages messages', () => {
  it('has the same keys in spanish and english', () => {
    expect(leaves(pagesMessages.en)).toEqual(leaves(pagesMessages.es))
  })

  it('names its nav entries', () => {
    expect(leaves(pagesMessages.es)).toEqual(expect.arrayContaining(['nav.pages', 'pages.title', 'pages.types.ACTION', 'pages.actionKinds.NAVIGATE']))
  })

  // MAP, WORKFLOW and TRANSITION strings belong to gis and workflow, which ship their own
  it('carries no string of a module component or action', () => {
    expect(leaves(pagesMessages.es).filter((key) => /MAP|WORKFLOW|TRANSITION|eometr|mockMap|mockWorkflow|transition/.test(key))).toEqual([])
  })
})
