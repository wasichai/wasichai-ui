import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Pencil, Plus, Power, PowerOff, RotateCw, Trash2, X } from 'lucide-react'
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, Input, Label, Table, Td, Th } from '@wasichai/ui'
import { describeError } from '../../api/client'
import { EmptyState, ErrorState, LoadingState } from '../../components/query-state/QueryState'
import { PageHeader } from '../../shell/PageHeader'
import { useCreateServiceAccount, useDeleteServiceAccount, useRoles, useRotateServiceAccountSecret, useServiceAccounts, useUpdateServiceAccount } from './api'
import { PROTECTED_ROLE, SERVICE_ACCOUNT_NAME, type ServiceAccount, type ServiceAccountWithSecret } from './types'

const CHECKBOX = 'h-4 w-4 accent-brand'

// what the one-time panel shows. lives in this component's state only: never cached, stored or logged
interface Revealed {
  name: string
  clientId: string
  clientSecret: string
}

const toggle = (list: string[], role: string) => (list.includes(role) ? list.filter((item) => item !== role) : [...list, role])

const when = (value: string | null) => (value ? new Date(value).toLocaleString() : '—')

export function ServiceAccountsPage() {
  const { t } = useTranslation()
  const accounts = useServiceAccounts()
  const { data: roles = [] } = useRoles()
  // the server refuses ADMIN for a service account (400): do not offer it
  const assignable = roles.filter((role) => role.name !== PROTECTED_ROLE)

  const create = useCreateServiceAccount()
  const update = useUpdateServiceAccount()
  const rotate = useRotateServiceAccountSecret()
  const remove = useDeleteServiceAccount()

  const [name, setName] = useState('')
  const [newRoles, setNewRoles] = useState<string[]>([])
  const [createError, setCreateError] = useState<string | null>(null)

  const [revealed, setRevealed] = useState<Revealed | null>(null)

  const [editing, setEditing] = useState<ServiceAccount | null>(null)
  const [editRoles, setEditRoles] = useState<string[]>([])
  const [editError, setEditError] = useState<string | null>(null)

  const [rowError, setRowError] = useState<string | null>(null)

  const trimmed = name.trim()
  const nameInvalid = trimmed !== '' && !SERVICE_ACCOUNT_NAME.test(trimmed)

  // copy the secret out, then reset the mutation so react-query (gcTime 0) forgets its answer
  const reveal = (account: ServiceAccountWithSecret, reset: () => void) => {
    setRevealed({ name: account.name, clientId: account.clientId, clientSecret: account.clientSecret })
    reset()
  }

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!SERVICE_ACCOUNT_NAME.test(trimmed)) return
    setCreateError(null)
    try {
      reveal(await create.mutateAsync({ name: trimmed, roles: newRoles }), create.reset)
      setName('')
      setNewRoles([])
    } catch (cause) {
      setCreateError(describeError(cause))
      create.reset()
    }
  }

  const openEditor = (account: ServiceAccount) => {
    setEditing(account)
    setEditRoles(account.roles)
    setEditError(null)
  }

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setEditError(null)
    try {
      await update.mutateAsync({ id: editing.id, roles: editRoles })
      setEditing(null)
    } catch (cause) {
      setEditError(describeError(cause))
    }
  }

  // one banner for the row buttons: whichever failed last
  const run = async (action: () => Promise<void>) => {
    setRowError(null)
    try {
      await action()
    } catch (cause) {
      setRowError(describeError(cause))
    }
  }

  const setEnabled = (account: ServiceAccount, enabled: boolean) => {
    // disabling stops new tokens at once: ask first. enabling harms nothing
    if (!enabled && !window.confirm(t('admin.serviceAccounts.confirmDisable', { name: account.name }))) return
    void run(async () => {
      await update.mutateAsync({ id: account.id, enabled })
    })
  }

  const rotateSecret = (account: ServiceAccount) => {
    if (!window.confirm(t('admin.serviceAccounts.confirmRotate'))) return
    void run(async () => {
      try {
        reveal(await rotate.mutateAsync(account.id), rotate.reset)
      } catch (cause) {
        rotate.reset()
        throw cause
      }
    })
  }

  const deleteAccount = (account: ServiceAccount) => {
    if (!window.confirm(t('admin.serviceAccounts.confirmDelete', { name: account.name }))) return
    void run(async () => {
      await remove.mutateAsync(account.id)
      if (editing?.id === account.id) setEditing(null)
    })
  }

  const copySecret = () => {
    if (!revealed) return
    // no clipboard (http, old browser) or refused: the field is still there to select by hand
    void navigator.clipboard?.writeText(revealed.clientSecret).catch(() => undefined)
  }

  const roleBoxes = (selected: string[], onToggle: (role: string) => void) => (
    <div className="flex flex-wrap gap-3">
      {assignable.map((role) => (
        <label key={role.name} className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" className={CHECKBOX} checked={selected.includes(role.name)} onChange={() => onToggle(role.name)} />
          {role.label}
        </label>
      ))}
    </div>
  )

  return (
    <>
      <PageHeader title={t('admin.serviceAccounts.title')} subtitle={t('admin.serviceAccounts.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.serviceAccounts.new')}</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={submitCreate} className="grid items-end gap-4 sm:grid-cols-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="service-account-name">{t('admin.serviceAccounts.name')}</Label>
                <Input
                  id="service-account-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="rentas"
                  autoComplete="off"
                  aria-invalid={nameInvalid}
                  aria-describedby="service-account-name-hint"
                  required
                />
                <p id="service-account-name-hint" className={nameInvalid ? 'text-xs text-danger' : 'text-xs text-ink-muted'}>
                  {t('admin.serviceAccounts.nameHint')}
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <Label>{t('admin.serviceAccounts.roles')}</Label>
                {roleBoxes(newRoles, (role) => setNewRoles((current) => toggle(current, role)))}
              </div>

              <div className="sm:col-span-3">
                {createError ? (
                  <Alert tone="danger" className="mb-2">
                    {createError}
                  </Alert>
                ) : null}
                <Button type="submit" disabled={!SERVICE_ACCOUNT_NAME.test(trimmed) || create.isPending}>
                  <Plus className="h-4 w-4" />
                  {t('common.create')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {revealed ? (
          <Card>
            <CardHeader>
              <CardTitle>{revealed.name}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Alert tone="warning">{t('admin.serviceAccounts.secretOnce')}</Alert>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="service-account-client-id">{t('admin.serviceAccounts.clientId')}</Label>
                  <Input id="service-account-client-id" readOnly value={revealed.clientId} className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="service-account-secret">{t('admin.serviceAccounts.clientSecret')}</Label>
                  <Input id="service-account-secret" readOnly value={revealed.clientSecret} className="font-mono" autoComplete="off" spellCheck={false} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={copySecret}>
                  <Copy className="h-4 w-4" />
                  {t('admin.serviceAccounts.copy')}
                </Button>
                <Button type="button" onClick={() => setRevealed(null)}>
                  {t('admin.serviceAccounts.done')}
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : null}

        {editing ? (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{t('admin.serviceAccounts.editing', { name: editing.name })}</CardTitle>
              <Button variant="ghost" size="icon" aria-label={t('common.cancel')} onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardBody>
              <form onSubmit={submitEdit} aria-label={t('admin.serviceAccounts.editing', { name: editing.name })} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label>{t('admin.serviceAccounts.roles')}</Label>
                  {roleBoxes(editRoles, (role) => setEditRoles((current) => toggle(current, role)))}
                </div>
                <div>
                  {editError ? (
                    <Alert tone="danger" className="mb-2">
                      {editError}
                    </Alert>
                  ) : null}
                  <Button type="submit" disabled={update.isPending}>
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          {rowError ? (
            <Alert tone="danger" className="border-b border-border bg-danger-soft px-5 py-3" onDismiss={() => setRowError(null)}>
              {rowError}
            </Alert>
          ) : null}
          {accounts.isPending ? (
            <LoadingState />
          ) : accounts.isError ? (
            <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
          ) : accounts.data.length === 0 ? (
            <EmptyState title={t('admin.serviceAccounts.empty')} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('admin.serviceAccounts.name')}</Th>
                  <Th>{t('admin.serviceAccounts.clientId')}</Th>
                  <Th>{t('admin.serviceAccounts.roles')}</Th>
                  <Th>{t('admin.serviceAccounts.status')}</Th>
                  <Th>{t('admin.serviceAccounts.createdAt')}</Th>
                  <Th>{t('admin.serviceAccounts.secretRotatedAt')}</Th>
                  <Th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {accounts.data.map((account) => (
                  <tr key={account.id} className="hover:bg-surface-muted">
                    <Td className="font-medium">{account.name}</Td>
                    <Td className="font-mono text-xs">{account.clientId}</Td>
                    <Td>
                      {account.roles.length === 0 ? (
                        <span className="text-xs text-ink-muted">{t('admin.serviceAccounts.noRoles')}</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {account.roles.map((role) => (
                            <Badge key={role}>{role}</Badge>
                          ))}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className={account.enabled ? 'text-success' : 'text-ink-muted'}>
                        {account.enabled ? t('admin.serviceAccounts.enabled') : t('admin.serviceAccounts.disabled')}
                      </span>
                    </Td>
                    <Td className="text-xs text-ink-muted">{when(account.createdAt)}</Td>
                    <Td className="text-xs text-ink-muted">{when(account.secretRotatedAt)}</Td>
                    <Td>
                      <span className="flex gap-1">
                        <Button variant="ghost" size="icon" aria-label={`${t('common.edit')} ${account.name}`} onClick={() => openEditor(account)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {account.enabled ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${t('admin.serviceAccounts.disable')} ${account.name}`}
                            disabled={update.isPending}
                            onClick={() => setEnabled(account, false)}
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${t('admin.serviceAccounts.enable')} ${account.name}`}
                            disabled={update.isPending}
                            onClick={() => setEnabled(account, true)}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${t('admin.serviceAccounts.rotate')} ${account.name}`}
                          disabled={rotate.isPending}
                          onClick={() => rotateSecret(account)}
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${t('common.delete')} ${account.name}`}
                          disabled={remove.isPending}
                          onClick={() => deleteAccount(account)}
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
