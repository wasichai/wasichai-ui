import type { Action, BuiltInAction, Permission } from './types'

// per-object actions. every object row gets these plus the global ones.
export const OBJECT_ACTIONS: BuiltInAction[] = ['READ', 'CREATE', 'UPDATE', 'DELETE']

// MANAGE_* is tenant-wide. it never belongs to a single object.
export const GLOBAL_ACTIONS: BuiltInAction[] = ['MANAGE_METADATA', 'MANAGE_ORGANIZATION']

export const BUILT_IN_ACTIONS: BuiltInAction[] = [...OBJECT_ACTIONS, ...GLOBAL_ACTIONS]

// row key standing for `objectName: null`. '*' is not a legal object name so it cannot clash.
export const EVERY_OBJECT = '*'

// row key -> action -> allowed. true is a granted cell, false a stored deny (reads unchecked).
// every permission the role came with lands here, rendered or not: the PUT replaces the whole
// list, so whatever the screen does not show must still go back out (ADR-042 declared actions).
export type PermissionMatrix = Record<string, Record<Action, boolean>>

export function isBuiltIn(action: Action): action is BuiltInAction {
  return (BUILT_IN_ACTIONS as Action[]).includes(action)
}

export function actionsForRow(rowKey: string): BuiltInAction[] {
  return rowKey === EVERY_OBJECT ? BUILT_IN_ACTIONS : OBJECT_ACTIONS
}

// what the screen may toggle. a declared action is always object-scoped, never tenant-wide.
export function isActionAllowedOnRow(rowKey: string, action: Action): boolean {
  if (isBuiltIn(action)) return actionsForRow(rowKey).includes(action)
  return rowKey !== EVERY_OBJECT
}

export function buildMatrix(permissions: Permission[]): PermissionMatrix {
  const matrix: PermissionMatrix = {}
  for (const permission of permissions) {
    const rowKey = permission.objectName ?? EVERY_OBJECT
    // a grant wins over a deny of the same cell: the server keeps one row per cell anyway
    const allowed = matrix[rowKey]?.[permission.action] === true || permission.allowed
    matrix[rowKey] = { ...matrix[rowKey], [permission.action]: allowed }
  }
  return matrix
}

export function isGranted(matrix: PermissionMatrix, rowKey: string, action: Action): boolean {
  return matrix[rowKey]?.[action] === true
}

export function toggleCell(matrix: PermissionMatrix, rowKey: string, action: Action): PermissionMatrix {
  if (!isActionAllowedOnRow(rowKey, action)) return matrix

  const row = { ...matrix[rowKey] }
  if (row[action] === true) delete row[action]
  else row[action] = true

  const next = { ...matrix }
  // drop the empty row so an on/off round trip lands back on the same matrix
  if (Object.keys(row).length === 0) delete next[rowKey]
  else next[rowKey] = row
  return next
}

// built-ins in canonical order, then anything else by name
function rowOrder(row: Record<Action, boolean>): Action[] {
  const builtIn = BUILT_IN_ACTIONS.filter((action) => action in row)
  const others = Object.keys(row)
    .filter((action) => !isBuiltIn(action))
    .sort()
  return [...builtIn, ...others]
}

// deterministic order: every object first, then object rows alphabetically
export function toPermissions(matrix: PermissionMatrix): Permission[] {
  const objectRows = Object.keys(matrix)
    .filter((key) => key !== EVERY_OBJECT)
    .sort()
  const rowKeys = (EVERY_OBJECT in matrix ? [EVERY_OBJECT] : []).concat(objectRows)

  return rowKeys.flatMap((rowKey) =>
    rowOrder(matrix[rowKey]).map<Permission>((action) => ({
      objectName: rowKey === EVERY_OBJECT ? null : rowKey,
      action,
      allowed: matrix[rowKey][action]
    }))
  )
}

export function grantedCount(permissions: Permission[]): number {
  return permissions.filter((permission) => permission.allowed).length
}
