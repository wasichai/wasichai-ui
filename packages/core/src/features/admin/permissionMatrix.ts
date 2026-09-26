import type { Action, Permission } from './types'

// per-object actions. every object row gets these plus the global ones.
export const OBJECT_ACTIONS: Action[] = ['READ', 'CREATE', 'UPDATE', 'DELETE']

// MANAGE_* is tenant-wide. it never belongs to a single object.
export const GLOBAL_ACTIONS: Action[] = ['MANAGE_METADATA', 'MANAGE_ORGANIZATION']

// row key standing for `objectName: null`. '*' is not a legal object name so it cannot clash.
export const EVERY_OBJECT = '*'

// row key -> granted actions. only granted cells are stored, so no permissions means {}.
export type PermissionMatrix = Record<string, Partial<Record<Action, boolean>>>

export function actionsForRow(rowKey: string): Action[] {
  return rowKey === EVERY_OBJECT ? [...OBJECT_ACTIONS, ...GLOBAL_ACTIONS] : OBJECT_ACTIONS
}

export function isActionAllowedOnRow(rowKey: string, action: Action): boolean {
  return actionsForRow(rowKey).includes(action)
}

export function buildMatrix(permissions: Permission[]): PermissionMatrix {
  const matrix: PermissionMatrix = {}
  for (const permission of permissions) {
    // a checkbox only knows granted / not granted. a deny reads the same as missing.
    if (!permission.allowed) continue
    const rowKey = permission.objectName ?? EVERY_OBJECT
    // drop nonsense the server may have stored, e.g. MANAGE_METADATA on one object
    if (!isActionAllowedOnRow(rowKey, permission.action)) continue
    matrix[rowKey] = { ...matrix[rowKey], [permission.action]: true }
  }
  return matrix
}

export function isGranted(matrix: PermissionMatrix, rowKey: string, action: Action): boolean {
  return matrix[rowKey]?.[action] === true
}

export function toggleCell(matrix: PermissionMatrix, rowKey: string, action: Action): PermissionMatrix {
  if (!isActionAllowedOnRow(rowKey, action)) return matrix

  const row = { ...matrix[rowKey] }
  if (row[action]) delete row[action]
  else row[action] = true

  const next = { ...matrix }
  // drop the empty row so an on/off round trip lands back on the same matrix
  if (Object.keys(row).length === 0) delete next[rowKey]
  else next[rowKey] = row
  return next
}

// deterministic order: every object first, then object rows alphabetically, actions canonical
export function toPermissions(matrix: PermissionMatrix): Permission[] {
  const objectRows = Object.keys(matrix)
    .filter((key) => key !== EVERY_OBJECT)
    .sort()
  const rowKeys = (EVERY_OBJECT in matrix ? [EVERY_OBJECT] : []).concat(objectRows)

  return rowKeys.flatMap((rowKey) =>
    actionsForRow(rowKey)
      .filter((action) => isGranted(matrix, rowKey, action))
      .map<Permission>((action) => ({
        objectName: rowKey === EVERY_OBJECT ? null : rowKey,
        action,
        allowed: true
      }))
  )
}

export function grantedCount(permissions: Permission[]): number {
  return permissions.filter((permission) => permission.allowed).length
}
