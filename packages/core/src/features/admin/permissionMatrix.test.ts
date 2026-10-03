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

  it('never lets MANAGE_* be toggled on a per-object row', () => {
    const matrix = buildMatrix([{ objectName: null, action: 'MANAGE_METADATA', allowed: true }])

    expect(isGranted(matrix, EVERY_OBJECT, 'MANAGE_METADATA')).toBe(true)

    const attempted = toggleCell(matrix, 'predio', 'MANAGE_ORGANIZATION')
    expect(attempted).toEqual(matrix)
    expect(toPermissions(attempted).every((item) => item.objectName === null)).toBe(true)
  })

  it('sends back a stray MANAGE_* on an object row it does not render', () => {
    // the screen shows no cell for it, but the PUT replaces everything: dropping it would delete it
    const permissions: Permission[] = [{ objectName: 'predio', action: 'MANAGE_METADATA', allowed: true }]
    expect(toPermissions(buildMatrix(permissions))).toEqual(permissions)
  })

  it('reads a deny as unchecked and sends it back untouched', () => {
    const permissions: Permission[] = [{ objectName: 'predio', action: 'READ', allowed: false }]
    const matrix = buildMatrix(permissions)

    expect(isGranted(matrix, 'predio', 'READ')).toBe(false)
    expect(toPermissions(matrix)).toEqual(permissions)
  })

  it('turns a deny into a grant when its cell is checked', () => {
    const matrix = toggleCell(buildMatrix([{ objectName: 'predio', action: 'READ', allowed: false }]), 'predio', 'READ')
    expect(toPermissions(matrix)).toEqual([{ objectName: 'predio', action: 'READ', allowed: true }])
  })

  it('keeps an action it does not know, untouched, through a save', () => {
    // ADR-042: declared actions are not in the built-in set. the PUT replaces the whole list.
    const permissions: Permission[] = [
      { objectName: null, action: 'READ', allowed: true },
      { objectName: 'recibo', action: 'READ', allowed: true },
      { objectName: 'recibo', action: 'ANULAR_AJENO', allowed: true },
      { objectName: 'recibo', action: 'REIMPRIMIR', allowed: false }
    ]

    const edited = toggleCell(buildMatrix(permissions), 'recibo', 'CREATE')

    expect(toPermissions(edited)).toEqual([
      { objectName: null, action: 'READ', allowed: true },
      { objectName: 'recibo', action: 'READ', allowed: true },
      { objectName: 'recibo', action: 'CREATE', allowed: true },
      { objectName: 'recibo', action: 'ANULAR_AJENO', allowed: true },
      { objectName: 'recibo', action: 'REIMPRIMIR', allowed: false }
    ])
  })

  it('grants and revokes a declared action on its object only', () => {
    const granted = toggleCell({}, 'recibo', 'ANULAR_AJENO')
    expect(isGranted(granted, 'recibo', 'ANULAR_AJENO')).toBe(true)
    expect(toPermissions(granted)).toEqual([{ objectName: 'recibo', action: 'ANULAR_AJENO', allowed: true }])

    expect(toggleCell(granted, 'recibo', 'ANULAR_AJENO')).toEqual({})

    // tenant-wide makes no sense for an object's own verb
    expect(toggleCell({}, EVERY_OBJECT, 'ANULAR_AJENO')).toEqual({})
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
