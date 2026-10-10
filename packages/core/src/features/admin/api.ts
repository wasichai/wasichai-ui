import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type {
  AdminUser,
  CreateRolePayload,
  CreateServiceAccountPayload,
  CreateUserPayload,
  DeclaredAction,
  FieldPermission,
  Permission,
  Role,
  ServiceAccount,
  ServiceAccountWithSecret,
  UpdateRolePayload,
  UpdateServiceAccountPayload,
  UpdateUserPayload
} from './types'

const USERS_KEY = ['admin', 'users']
const ROLES_KEY = ['admin', 'roles']
const SERVICE_ACCOUNTS_KEY = ['admin', 'service-accounts']

export function useAdminUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: () => api<AdminUser[]>('/users')
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => api<AdminUser>('/users', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY })
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateUserPayload & { id: string }) => api<AdminUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY })
  })
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) => api<AdminUser>(`/users/${id}/roles`, { method: 'PUT', body: JSON.stringify({ roles }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY })
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY })
  })
}

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => api<Role[]>('/roles')
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => api<Role>('/roles', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY })
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, ...payload }: UpdateRolePayload & { name: string }) => api<Role>(`/roles/${name}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY })
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api<void>(`/roles/${name}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROLES_KEY })
      // a deleted role drops off every user that held it
      void queryClient.invalidateQueries({ queryKey: USERS_KEY })
    }
  })
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, permissions }: { name: string; permissions: Permission[] }) =>
      api<Role>(`/roles/${name}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY })
  })
}

export function useUpdateRoleFieldPermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, fields }: { name: string; fields: FieldPermission[] }) =>
      api<Role>(`/roles/${name}/field-permissions`, {
        method: 'PUT',
        body: JSON.stringify({ fields })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY })
  })
}

// each object's declared actions (ADR-042), by object name. an object whose list failed (e.g. 403
// without READ on it) is simply missing: its grants still round-trip through the matrix.
export function useDeclaredActions(objectNames: string[], enabled: boolean): Record<string, DeclaredAction[]> {
  return useQueries({
    queries: objectNames.map((name) => ({
      // under ['objects', name] so invalidating an object refreshes its actions too
      queryKey: ['objects', name, 'actions'],
      queryFn: () => api<DeclaredAction[]>(`/metadata/objects/${name}/actions`),
      enabled
    })),
    combine: (results) => {
      const byObject: Record<string, DeclaredAction[]> = {}
      results.forEach((result, index) => {
        if (result.data) byObject[objectNames[index]] = result.data
      })
      return byObject
    }
  })
}

export function useServiceAccounts() {
  return useQuery({
    queryKey: SERVICE_ACCOUNTS_KEY,
    queryFn: () => api<ServiceAccount[]>('/service-accounts')
  })
}

// create and rotate answer the secret. gcTime 0: once the page resets the mutation, react-query
// drops it at once instead of keeping the secret in its mutation cache for minutes
export function useCreateServiceAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateServiceAccountPayload) => api<ServiceAccountWithSecret>('/service-accounts', { method: 'POST', body: JSON.stringify(payload) }),
    gcTime: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SERVICE_ACCOUNTS_KEY })
  })
}

export function useUpdateServiceAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateServiceAccountPayload & { id: string }) =>
      api<ServiceAccount>(`/service-accounts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SERVICE_ACCOUNTS_KEY })
  })
}

export function useRotateServiceAccountSecret() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<ServiceAccountWithSecret>(`/service-accounts/${encodeURIComponent(id)}/secret`, { method: 'POST' }),
    gcTime: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SERVICE_ACCOUNTS_KEY })
  })
}

export function useDeleteServiceAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/service-accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SERVICE_ACCOUNTS_KEY })
  })
}
