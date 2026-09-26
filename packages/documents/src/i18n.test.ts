import { describe, expect, it } from 'vitest'
import { documentsMessages } from './i18n'

function leaves(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? leaves(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]
    )
    .sort()
}

describe('documents messages', () => {
  it('has the same keys in spanish and english', () => {
    expect(leaves(documentsMessages.en)).toEqual(leaves(documentsMessages.es))
  })

  it('names its nav entries', () => {
    expect(leaves(documentsMessages.es)).toEqual(
      expect.arrayContaining(['nav.documents', 'operations.ISSUE', 'history.viewDocument', 'history.documentUnavailable', 'documents.print.link'])
    )
  })
})
