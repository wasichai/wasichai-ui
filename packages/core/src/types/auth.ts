export interface AuthUser {
  id: string
  email: string
  displayName: string
  organizationId: string
  roles: string[]
}

// GET /auth/me/permissions: record actions per object the caller may read. asking grants nothing,
// every write is still checked by the server.
export interface CallerPermissions {
  admin: boolean
  objects: Record<string, string[]>
}
