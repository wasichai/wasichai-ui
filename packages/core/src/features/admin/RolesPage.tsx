import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Alert, Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Badge, Table, Td, Th } from '@wasichai/ui'
import { describeError } from '../../api/client'
import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from './api'
import { grantedCount } from './permissionMatrix'
import { PROTECTED_ROLE, type Role } from './types'

const CHECKBOX = 'h-4 w-4 accent-brand'

export function RolesPage() {
  const { t } = useTranslation()
  const { data: roles = [], isLoading } = useRoles()
  const create = useCreateRole()
  const update = useUpdateRole()
  const remove = useDeleteRole()

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [ownRecordsOnly, setOwnRecordsOnly] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Role | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editOwn, setEditOwn] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [notice, setNotice] = useState<string | null>(null)

  const openEditor = (role: Role) => {
    setEditing(role)
    setEditLabel(role.label)
    setEditOwn(role.ownRecordsOnly)
    setEditError(null)
  }

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    setCreateError(null)
    try {
      const technical = name.trim().toUpperCase()
      await create.mutateAsync({
        name: technical,
        label: label.trim() || technical,
        ownRecordsOnly
      })
      setName('')
      setLabel('')
      setOwnRecordsOnly(false)
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
        name: editing.name,
        label: editLabel.trim() || editing.name,
        ownRecordsOnly: editOwn
      })
      setEditing(null)
    } catch (cause) {
      setEditError(describeError(cause))
    }
  }

  const deleteRole = (role: Role) => {
    setNotice(null)
    // refuse before the request: the server would reject it anyway, say why here
    if (role.name === PROTECTED_ROLE) {
      setNotice(t('admin.roles.adminProtected'))
      return
    }
    if (window.confirm(t('admin.roles.confirmDelete', { name: role.name }))) {
      remove.mutate(role.name, { onError: (cause) => setNotice(describeError(cause)) })
    }
  }

  return (
    <>
      <PageHeader title={t('admin.roles.title')} subtitle={t('admin.roles.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.roles.new')}</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={submitCreate} className="grid items-end gap-4 sm:grid-cols-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="role-name">{t('admin.roles.name')}</Label>
                <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="INSPECTOR" required />
                <p className="text-xs text-ink-muted">{t('admin.roles.nameHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-label">{t('admin.roles.label')}</Label>
                <Input id="role-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Inspector" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('admin.roles.ownRecordsOnly')}</Label>
                <label className="flex h-9 items-center gap-2 text-sm text-ink">
                  <input type="checkbox" className={CHECKBOX} checked={ownRecordsOnly} onChange={(event) => setOwnRecordsOnly(event.target.checked)} />
                  {t('admin.roles.ownRecordsOnlyHint')}
                </label>
              </div>

              <div className="sm:col-span-3">
                {createError ? <p className="mb-2 text-sm text-danger">{createError}</p> : null}
                <Button type="submit" disabled={!name.trim() || create.isPending}>
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
              <CardTitle>
                {t('admin.roles.edit')} — {editing.name}
              </CardTitle>
              <Button variant="ghost" size="icon" aria-label={t('common.cancel')} onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardBody>
              <form onSubmit={submitEdit} className="grid items-end gap-4 sm:grid-cols-3" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="role-edit-label">{t('admin.roles.label')}</Label>
                  <Input id="role-edit-label" value={editLabel} onChange={(event) => setEditLabel(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('admin.roles.ownRecordsOnly')}</Label>
                  <label className="flex h-9 items-center gap-2 text-sm text-ink">
                    <input type="checkbox" className={CHECKBOX} checked={editOwn} onChange={(event) => setEditOwn(event.target.checked)} />
                    {t('admin.roles.ownRecordsOnlyHint')}
                  </label>
                </div>
                <div className="sm:col-span-3">
                  {editError ? <p className="mb-2 text-sm text-danger">{editError}</p> : null}
                  <Button type="submit" disabled={update.isPending}>
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          {notice ? (
            <Alert tone="danger" className="border-b border-border bg-danger-soft px-5 py-3" onDismiss={() => setNotice(null)}>
              {notice}
            </Alert>
          ) : null}
          {isLoading ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('common.loading')}</p>
          ) : roles.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('admin.roles.empty')}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('admin.roles.label')}</Th>
                  <Th>{t('admin.roles.name')}</Th>
                  <Th>{t('admin.roles.ownRecordsOnly')}</Th>
                  <Th>{t('admin.roles.permissionsCount')}</Th>
                  <Th>{t('admin.roles.fieldsCount')}</Th>
                  <Th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-surface-muted">
                    <Td className="font-medium">{role.label}</Td>
                    <Td>
                      <Badge>{role.name}</Badge>
                    </Td>
                    <Td className="text-ink-muted">
                      {role.ownRecordsOnly ? <Check className="h-4 w-4 text-success" aria-label={t('admin.roles.ownRecordsOnly')} /> : '—'}
                    </Td>
                    <Td>{grantedCount(role.permissions)}</Td>
                    <Td>{role.fieldPermissions.length}</Td>
                    <Td>
                      <span className="flex gap-1">
                        <Button variant="ghost" size="icon" aria-label={`${t('common.edit')} ${role.name}`} onClick={() => openEditor(role)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${t('common.delete')} ${role.name}`}
                          title={role.name === PROTECTED_ROLE ? t('admin.roles.adminProtected') : undefined}
                          onClick={() => deleteRole(role)}
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
