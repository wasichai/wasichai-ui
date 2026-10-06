import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { PageHeader } from '../../shell/PageHeader'
import { Alert, Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Badge, Table, Td, Th } from '@wasichai/ui'
import { describeError } from '../../api/client'
import { useAdminUsers, useCreateUser, useDeleteUser, useRoles, useUpdateUser, useUpdateUserRoles } from './api'
import type { AdminUser } from './types'

const CHECKBOX = 'h-4 w-4 accent-brand'

export function UsersPage() {
  const { t } = useTranslation()
  const { user: signedIn } = useAuth()
  const { data: users = [], isLoading } = useAdminUsers()
  const { data: roles = [] } = useRoles()

  const create = useCreateUser()
  const update = useUpdateUser()
  const updateRoles = useUpdateUserRoles()
  const remove = useDeleteUser()

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [newRoles, setNewRoles] = useState<string[]>([])
  const [createError, setCreateError] = useState<string | null>(null)

  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editEnabled, setEditEnabled] = useState(true)
  const [editPassword, setEditPassword] = useState('')
  const [editRoles, setEditRoles] = useState<string[]>([])
  const [editError, setEditError] = useState<string | null>(null)

  const isSelf = (item: AdminUser) => item.id === signedIn?.id

  const toggle = (list: string[], role: string) => (list.includes(role) ? list.filter((item) => item !== role) : [...list, role])

  const openEditor = (item: AdminUser) => {
    setEditing(item)
    setEditName(item.displayName)
    setEditEnabled(item.enabled)
    setEditRoles(item.roles)
    setEditPassword('')
    setEditError(null)
  }

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    setCreateError(null)
    try {
      await create.mutateAsync({
        email: email.trim().toLowerCase(),
        displayName: displayName.trim() || email.trim(),
        password,
        roles: newRoles
      })
      setEmail('')
      setDisplayName('')
      setPassword('')
      setNewRoles([])
    } catch (cause) {
      setCreateError(describeError(cause))
    }
  }

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setEditError(null)
    try {
      await update.mutateAsync({
        id: editing.id,
        displayName: editName.trim(),
        // never let an admin lock themselves out
        enabled: isSelf(editing) ? true : editEnabled,
        ...(editPassword ? { password: editPassword } : {})
      })
      await updateRoles.mutateAsync({ id: editing.id, roles: editRoles })
      setEditing(null)
    } catch (cause) {
      setEditError(describeError(cause))
    }
  }

  return (
    <>
      <PageHeader title={t('admin.users.title')} subtitle={t('admin.users.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.users.new')}</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={submitCreate} className="grid items-end gap-4 sm:grid-cols-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="user-email">{t('admin.users.email')}</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="inspector@wasichai.test"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-name">{t('admin.users.displayName')}</Label>
                <Input id="user-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-password">{t('admin.users.password')}</Label>
                <Input id="user-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <Label>{t('admin.users.roles')}</Label>
                <div className="flex flex-wrap gap-3">
                  {roles.map((role) => (
                    <label key={role.name} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        className={CHECKBOX}
                        checked={newRoles.includes(role.name)}
                        onChange={() => setNewRoles((current) => toggle(current, role.name))}
                      />
                      {role.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-3">
                {createError ? <p className="mb-2 text-sm text-danger">{createError}</p> : null}
                <Button type="submit" disabled={!email || !password || create.isPending}>
                  <Plus className="h-4 w-4" />
                  {t('common.create')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {editing ? (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{t('admin.users.editing', { name: editing.displayName })}</CardTitle>
              <Button variant="ghost" size="icon" aria-label={t('common.cancel')} onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardBody>
              <form onSubmit={submitEdit} className="grid items-end gap-4 sm:grid-cols-3" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">{t('admin.users.displayName')}</Label>
                  <Input id="edit-name" value={editName} onChange={(event) => setEditName(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-password">{t('admin.users.newPassword')}</Label>
                  <Input id="edit-password" type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} />
                  <p className="text-xs text-ink-muted">{t('admin.users.passwordHint')}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('admin.users.status')}</Label>
                  <label className="flex h-9 items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      className={CHECKBOX}
                      checked={isSelf(editing) ? true : editEnabled}
                      disabled={isSelf(editing)}
                      title={isSelf(editing) ? t('admin.users.selfHint') : undefined}
                      onChange={(event) => setEditEnabled(event.target.checked)}
                    />
                    {t('admin.users.enabled')}
                  </label>
                  {isSelf(editing) ? <p className="text-xs text-ink-muted">{t('admin.users.selfHint')}</p> : null}
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <Label>{t('admin.users.roles')}</Label>
                  <div className="flex flex-wrap gap-3">
                    {roles.map((role) => (
                      <label key={role.name} className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          className={CHECKBOX}
                          checked={editRoles.includes(role.name)}
                          onChange={() => setEditRoles((current) => toggle(current, role.name))}
                        />
                        {role.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  {editError ? <p className="mb-2 text-sm text-danger">{editError}</p> : null}
                  <Button type="submit" disabled={update.isPending || updateRoles.isPending}>
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          {remove.isError ? (
            <Alert tone="danger" className="border-b border-border bg-danger-soft px-5 py-3" onDismiss={() => remove.reset()}>
              {describeError(remove.error)}
            </Alert>
          ) : null}
          {isLoading ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('common.loading')}</p>
          ) : users.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('admin.users.empty')}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('admin.users.displayName')}</Th>
                  <Th>{t('admin.users.email')}</Th>
                  <Th>{t('admin.users.roles')}</Th>
                  <Th>{t('admin.users.status')}</Th>
                  <Th>{t('admin.users.createdAt')}</Th>
                  <Th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-muted">
                    <Td className="font-medium">
                      {item.displayName}
                      {isSelf(item) ? <span className="ml-2 text-xs text-ink-muted">({t('admin.users.self')})</span> : null}
                    </Td>
                    <Td className="font-mono text-xs">{item.email}</Td>
                    <Td>
                      {item.roles.length === 0 ? (
                        <span className="text-xs text-ink-muted">{t('admin.users.noRoles')}</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {item.roles.map((role) => (
                            <Badge key={role}>{role}</Badge>
                          ))}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className={item.enabled ? 'text-success' : 'text-ink-muted'}>
                        {item.enabled ? t('admin.users.enabled') : t('admin.users.disabled')}
                      </span>
                    </Td>
                    <Td className="text-xs text-ink-muted">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</Td>
                    <Td>
                      <span className="flex gap-1">
                        <Button variant="ghost" size="icon" aria-label={`${t('common.edit')} ${item.email}`} onClick={() => openEditor(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${t('common.delete')} ${item.email}`}
                          disabled={isSelf(item)}
                          title={isSelf(item) ? t('admin.users.selfHint') : undefined}
                          onClick={() => {
                            if (isSelf(item)) return
                            if (window.confirm(t('admin.users.confirmDelete', { name: item.displayName }))) {
                              remove.mutate(item.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
