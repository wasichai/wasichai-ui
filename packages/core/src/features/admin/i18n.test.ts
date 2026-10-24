import { describe, expect, it } from 'vitest'
import { adminMessages } from './i18n'
import { BUILT_IN_ACTIONS } from './permissionMatrix'

function leaves(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) =>
      typeof value === 'object' && value !== null ? leaves(value as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]
    )
    .sort()
}

describe('admin messages', () => {
  it('has the same keys in spanish and english', () => {
    expect(leaves(adminMessages.en)).toEqual(leaves(adminMessages.es))
  })

  it('names every built-in verb', () => {
    expect(Object.keys(adminMessages.es.admin.permissions.actions).sort()).toEqual([...BUILT_IN_ACTIONS].sort())
  })
})
