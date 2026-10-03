import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { Table, Td, Th } from '@wasichai/ui'
import { ApiError } from '../../api/client'
import { useObjectDefinition, useObjects } from '../../queries'
import { useDeclaredActions, useRoles, useUpdateRoleFieldPermissions, useUpdateRolePermissions } from './api'
import { BUILT_IN_ACTIONS, buildMatrix, EVERY_OBJECT, GLOBAL_ACTIONS, isGranted, toPermissions, toggleCell, type PermissionMatrix } from './permissionMatrix'
import { PROTECTED_ROLE, type FieldPermission } from './types'

const CHECKBOX = 'h-4 w-4 accent-brand'

// field rule: no explicit entry means the role sees everything, so default both boxes on
type FieldGrants = Record<string, { read: boolean; write: boolean }>

function describe(cause: unknown): string {
  return cause instanceof ApiError ? [cause.message, ...cause.violations.map((v) => `${v.field}: ${v.message}`)].join(' — ') : String(cause)
}

export function PermissionsPage() {
  const { t } = useTranslation()
  const { data: roles = [] } = useRoles()
  const { data: objects = [] } = useObjects()
  const savePermissions = useUpdateRolePermissions()
  const saveFields = useUpdateRoleFieldPermissions()

  const [roleName, setRoleName] = useState('')
  const [matrix, setMatrix] = useState<PermissionMatrix>({})
  const [matrixError, setMatrixError] = useState<string | null>(null)

  const [objectName, setObjectName] = useState('')
  const [grants, setGrants] = useState<FieldGrants>({})
  const [fieldError, setFieldError] = useState<string | null>(null)

  const role = useMemo(() => roles.find((item) => item.name === roleName), [roles, roleName])
  const { data: definition } = useObjectDefinition(objectName || undefined)
  const fields = definition?.fields ?? []

  // matrix is local while editing. reload it whenever the role changes on the server.
  useEffect(() => {
    setMatrix(role ? buildMatrix(role.permissions) : {})
    setMatrixError(null)
  }, [role])

  useEffect(() => {
    if (!role || !objectName) {
      setGrants({})
      return
    }
    const stored = role.fieldPermissions.filter((item) => item.objectName === objectName)
    const next: FieldGrants = {}
    for (const field of fields) {
      const entry = stored.find((item) => item.fieldName === field.name)
      next[field.name] = { read: entry?.read ?? true, write: entry?.write ?? true }
    }
    setGrants(next)
    setFieldError(null)
  }, [role, objectName, definition])

  const restricted = role?.fieldPermissions.some((item) => item.objectName === objectName) ?? false

  const rowKeys = [EVERY_OBJECT, ...objects.map((item) => item.name)]
  // only once a role is picked: the matrix is the only reader
  const declared = useDeclaredActions(
    objects.map((item) => item.name),
    Boolean(role)
  )

  const submitMatrix = async () => {
    if (!role) return
    setMatrixError(null)
    try {
      await savePermissions.mutateAsync({ name: role.name, permissions: toPermissions(matrix) })
    } catch (cause) {
      setMatrixError(describe(cause))
    }
  }

  const submitFields = async () => {
    if (!role || !objectName) return
    setFieldError(null)
    const payload: FieldPermission[] = fields.map((field) => ({
      objectName,
      fieldName: field.name,
      read: grants[field.name]?.read ?? true,
      write: grants[field.name]?.write ?? true
    }))
    try {
      await saveFields.mutateAsync({ name: role.name, fields: payload })
    } catch (cause) {
      setFieldError(describe(cause))
    }
  }

  return (
    <>
      <PageHeader title={t('admin.permissions.title')} subtitle={t('admin.permissions.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardBody>
            <div className="max-w-xs space-y-1.5">
              <Label>{t('admin.permissions.role')}</Label>
              <Select value={roleName} onValueChange={setRoleName}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.permissions.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((item) => (
                    <SelectItem key={item.name} value={item.name}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardBody>
        </Card>

        {!role ? (
          <Card>
            <p className="px-5 py-8 text-sm text-ink-muted">{t('admin.permissions.noRole')}</p>
          </Card>
        ) : (
          <>
            {role.name === PROTECTED_ROLE ? (
              <div className="flex items-start gap-3 rounded-card border border-border bg-brand-soft px-5 py-4 text-sm text-ink">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" />
                <p>{t('admin.permissions.adminBanner')}</p>
              </div>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>{t('admin.permissions.matrix')}</CardTitle>
              </CardHeader>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('admin.permissions.object')}</Th>
                    {BUILT_IN_ACTIONS.map((action) => (
                      <Th key={action} className="text-center">
                        {action}
                      </Th>
                    ))}
                    <Th>{t('admin.permissions.declaredActions')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rowKeys.map((rowKey) => {
                    const every = rowKey === EVERY_OBJECT
                    const object = objects.find((item) => item.name === rowKey)
                    return (
                      <tr key={rowKey} className="hover:bg-surface-muted">
                        <Td className={every ? 'font-medium' : ''}>
                          {every ? t('admin.permissions.everyObject') : (object?.label ?? rowKey)}
                          <span className="ml-2 font-mono text-xs text-ink-muted">{every ? t('admin.permissions.everyObjectHint') : rowKey}</span>
                        </Td>
                        {BUILT_IN_ACTIONS.map((action) => {
                          // MANAGE_* is tenant-wide: only the every-object row offers it
                          const global = GLOBAL_ACTIONS.includes(action)
                          if (global && !every) {
                            return (
                              <Td key={action} className="text-center text-xs text-ink-muted" title={t('admin.permissions.notApplicable')}>
                                —
                              </Td>
                            )
                          }
                          return (
                            <Td key={action} className="text-center">
                              <input
                                type="checkbox"
                                className={CHECKBOX}
                                aria-label={`${rowKey} ${action}`}
                                checked={isGranted(matrix, rowKey, action)}
                                onChange={() => setMatrix((current) => toggleCell(current, rowKey, action))}
                              />
                            </Td>
                          )
                        })}
                        {every ? (
                          // a declared action is the object's own verb: it means nothing tenant-wide
                          <Td className="text-xs text-ink-muted" title={t('admin.permissions.declaredObjectOnly')}>
                            —
                          </Td>
                        ) : (
                          <Td>
                            {(declared[rowKey] ?? []).length === 0 ? (
                              <span className="text-xs text-ink-muted">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {declared[rowKey].map((item) => (
                                  <label key={item.name} className="inline-flex items-center gap-1.5 text-sm" title={item.name}>
                                    <input
                                      type="checkbox"
                                      className={CHECKBOX}
                                      aria-label={`${rowKey} ${item.name}`}
                                      checked={isGranted(matrix, rowKey, item.name)}
                                      onChange={() => setMatrix((current) => toggleCell(current, rowKey, item.name))}
                                    />
                                    {item.label || item.name}
                                  </label>
                                ))}
                              </div>
                            )}
                          </Td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
              <CardBody className="border-t border-border">
                {matrixError ? <p className="mb-2 text-sm text-danger">{matrixError}</p> : null}
                <Button onClick={submitMatrix} disabled={savePermissions.isPending}>
                  {t('admin.permissions.save')}
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('admin.permissions.fieldPermissions')}</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="text-sm text-ink-muted">{t('admin.permissions.fieldPermissionsHint')}</p>
                <div className="max-w-xs space-y-1.5">
                  <Label>{t('admin.permissions.selectObject')}</Label>
                  <Select value={objectName} onValueChange={setObjectName}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.permissions.selectObject')} />
                    </SelectTrigger>
                    <SelectContent>
                      {objects.map((item) => (
                        <SelectItem key={item.id} value={item.name}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {objectName && !restricted ? <p className="text-sm text-ink-muted">{t('admin.permissions.unrestricted')}</p> : null}
              </CardBody>

              {objectName ? (
                fields.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-ink-muted">{t('admin.permissions.noFields')}</p>
                ) : (
                  <>
                    <Table>
                      <thead>
                        <tr>
                          <Th>{t('admin.permissions.field')}</Th>
                          <Th className="text-center">{t('admin.permissions.read')}</Th>
                          <Th className="text-center">{t('admin.permissions.write')}</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field) => {
                          const grant = grants[field.name] ?? { read: true, write: true }
                          return (
                            <tr key={field.id} className="hover:bg-surface-muted">
                              <Td>
                                {field.label}
                                <span className="ml-2 font-mono text-xs text-ink-muted">{field.name}</span>
                              </Td>
                              <Td className="text-center">
                                <input
                                  type="checkbox"
                                  className={CHECKBOX}
                                  aria-label={`${field.name} read`}
                                  checked={grant.read}
                                  onChange={(event) =>
                                    setGrants((current) => ({
                                      ...current,
                                      [field.name]: {
                                        // no read means no write either
                                        read: event.target.checked,
                                        write: event.target.checked && grant.write
                                      }
                                    }))
                                  }
                                />
                              </Td>
                              <Td className="text-center">
                                <input
                                  type="checkbox"
                                  className={CHECKBOX}
                                  aria-label={`${field.name} write`}
                                  checked={grant.write}
                                  disabled={!grant.read}
                                  onChange={(event) =>
                                    setGrants((current) => ({
                                      ...current,
                                      [field.name]: { read: grant.read, write: event.target.checked }
                                    }))
                                  }
                                />
                              </Td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </Table>
                    <CardBody className="border-t border-border">
                      {fieldError ? <p className="mb-2 text-sm text-danger">{fieldError}</p> : null}
                      <Button onClick={submitFields} disabled={saveFields.isPending}>
                        {t('admin.permissions.saveFields')}
                      </Button>
                    </CardBody>
                  </>
                )
              ) : null}
            </Card>
          </>
        )}
      </div>
    </>
  )
}
