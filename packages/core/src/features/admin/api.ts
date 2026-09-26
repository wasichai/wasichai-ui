import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { AdminUser, CreateRolePayload, CreateUserPayload, FieldPermission, Permission, Role, UpdateRolePayload, UpdateUserPayload } from './types'

const USERS_KEY = ['admin', 'users']
const ROLES_KEY = ['admin', 'roles']

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
