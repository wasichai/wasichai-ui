// security administration shapes. mirrors the /api/users and /api/roles contract.

// the six actions the platform knows. the matrix renders them as fixed columns.
export type BuiltInAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'MANAGE_METADATA' | 'MANAGE_ORGANIZATION'

// a permission may also carry an action an object declares (ADR-042), so any string.
// a closed union here dropped those on save and the replace-all PUT deleted them.
export type Action = string

export type { DeclaredAction } from '../../types/metadata'

export interface AdminUser {
  id: string
  email: string
  displayName: string
  enabled: boolean
  roles: string[]
  createdAt: string | null
}

// objectName null means every object
export interface Permission {
  objectName: string | null
  action: Action
  allowed: boolean
}

export interface FieldPermission {
  objectName: string
  fieldName: string
  read: boolean
  write: boolean
}

export interface Role {
  id: string
  name: string
  label: string
  // record-level rule: this role only sees what it created
  ownRecordsOnly: boolean
  permissions: Permission[]
  fieldPermissions: FieldPermission[]
}

export interface CreateUserPayload {
  email: string
  displayName: string
  password: string
  roles: string[]
}

export interface UpdateUserPayload {
  displayName?: string
  enabled?: boolean
  password?: string
}

export interface CreateRolePayload {
  name: string
  label: string
  ownRecordsOnly: boolean
}

export interface UpdateRolePayload {
  label?: string
  ownRecordsOnly?: boolean
}

// the role that administers the tenant. deleting it locks everybody out, and it bypasses
// every permission check, so the matrix screen warns about it.
export const PROTECTED_ROLE = 'ADMIN'

// a server-to-server caller (ADR-043). clientId is its id; the secret is never listed.
export interface ServiceAccount {
  id: string
  clientId: string
  name: string
  enabled: boolean
  roles: string[]
  createdAt: string | null
  secretRotatedAt: string | null
}

// create and rotate only: the server keeps a hash, this is the one time it is seen
export interface ServiceAccountWithSecret extends ServiceAccount {
  clientSecret: string
}

export interface CreateServiceAccountPayload {
  name: string
  roles: string[]
}

// roles replace the whole set; a key left out is kept
export interface UpdateServiceAccountPayload {
  enabled?: boolean
  roles?: string[]
}

// the server's rule; the name never changes after create
export const SERVICE_ACCOUNT_NAME = /^[a-z][a-z0-9_-]{1,48}$/
