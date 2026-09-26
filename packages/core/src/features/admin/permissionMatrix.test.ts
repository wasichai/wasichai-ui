import { describe, expect, it } from 'vitest'
import { buildMatrix, EVERY_OBJECT, grantedCount, isGranted, toPermissions, toggleCell } from './permissionMatrix'
import type { Permission } from './types'

describe('permissionMatrix', () => {
  it('yields an empty matrix for a role with no permissions', () => {
    expect(buildMatrix([])).toEqual({})
    expect(toPermissions({})).toEqual([])
  })

  it('maps the every-object row to objectName null', () => {
    const permissions: Permission[] = [
      { objectName: null, action: 'READ', allowed: true },
      { objectName: 'predio', action: 'UPDATE', allowed: true }
    ]

    const matrix = buildMatrix(permissions)

    expect(isGranted(matrix, EVERY_OBJECT, 'READ')).toBe(true)
    expect(isGranted(matrix, 'predio', 'UPDATE')).toBe(true)
    expect(toPermissions(matrix)).toEqual(permissions)
  })

  it('round-trips when a cell is toggled on and then off', () => {
    const permissions: Permission[] = [
      { objectName: null, action: 'READ', allowed: true },
      { objectName: 'predio', action: 'CREATE', allowed: true }
    ]
    const matrix = buildMatrix(permissions)

    const on = toggleCell(matrix, 'predio', 'DELETE')
    expect(isGranted(on, 'predio', 'DELETE')).toBe(true)

    const off = toggleCell(on, 'predio', 'DELETE')
    expect(off).toEqual(matrix)
    expect(toPermissions(off)).toEqual(permissions)
  })

  it('drops a row once its last cell is turned off', () => {
    const matrix = buildMatrix([{ objectName: 'predio', action: 'READ', allowed: true }])
    expect(toggleCell(matrix, 'predio', 'READ')).toEqual({})
  })

  it('never carries MANAGE_* on a per-object row', () => {
    const matrix = buildMatrix([
      { objectName: 'predio', action: 'MANAGE_METADATA', allowed: true },
      { objectName: null, action: 'MANAGE_METADATA', allowed: true }
    ])

    expect(isGranted(matrix, 'predio', 'MANAGE_METADATA')).toBe(false)
    expect(isGranted(matrix, EVERY_OBJECT, 'MANAGE_METADATA')).toBe(true)

    // and it cannot be toggled on either
    const attempted = toggleCell(matrix, 'predio', 'MANAGE_ORGANIZATION')
    expect(attempted).toEqual(matrix)
    expect(toPermissions(attempted).every((item) => item.objectName === null)).toBe(true)
  })

  it('ignores denied permissions', () => {
    const matrix = buildMatrix([{ objectName: 'predio', action: 'READ', allowed: false }])
    expect(matrix).toEqual({})
  })

  it('serialises rows in a stable order: every object first, then alphabetical', () => {
    const matrix = buildMatrix([
      { objectName: 'via', action: 'READ', allowed: true },
      { objectName: 'predio', action: 'DELETE', allowed: true },
      { objectName: 'predio', action: 'READ', allowed: true },
      { objectName: null, action: 'CREATE', allowed: true }
    ])

    expect(toPermissions(matrix)).toEqual([
      { objectName: null, action: 'CREATE', allowed: true },
      { objectName: 'predio', action: 'READ', allowed: true },
      { objectName: 'predio', action: 'DELETE', allowed: true },
      { objectName: 'via', action: 'READ', allowed: true }
    ])
  })

  it('counts only granted permissions', () => {
    expect(
      grantedCount([
        { objectName: null, action: 'READ', allowed: true },
        { objectName: null, action: 'DELETE', allowed: false }
      ])
    ).toBe(1)
  })
})
