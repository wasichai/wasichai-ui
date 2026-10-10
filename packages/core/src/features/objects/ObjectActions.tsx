import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { Alert, Button, Card, CardBody, CardHeader, CardTitle, Input, Label, Table, Td, Th } from '@wasichai/ui'
import { useCreateObjectAction, useDeleteObjectAction, useObjectActions } from '../../queries'
import { describeError } from '../../api/client'
import { actionNameProblem } from './objectDraft'

// the object's own verbs beyond CRUD (ADR-042). declared here, granted per role on the permissions page.
export function ObjectActions({ objectName }: { objectName: string }) {
  const { t } = useTranslation()
  const query = useObjectActions(objectName)
  const actions = query.data ?? []
  const create = useCreateObjectAction(objectName)
  const remove = useDeleteObjectAction(objectName)

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const problem = actionNameProblem(name, actions)

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  const declare = () => {
    if (problem) return
    void run(async () => {
      await create.mutateAsync({ name: name.trim(), label: label.trim() })
      setName('')
      setLabel('')
    })
  }

  const drop = (action: string) => {
    if (window.confirm(t('objects.actions.confirmDelete', { name: action }))) void run(() => remove.mutateAsync(action))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('objects.actions.title')}</CardTitle>
        <p className="mt-1 text-xs text-ink-muted">{t('objects.actions.hint')}</p>
      </CardHeader>

      {error ? (
        <Alert tone="danger" className="border-b border-border bg-danger-soft px-5 py-3" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {/* a failed read is not an empty list: say why instead */}
      {query.error ? (
        <Alert tone="danger" className="border-b border-border bg-danger-soft px-5 py-3">
          {describeError(query.error)}
        </Alert>
      ) : null}

      {query.isLoading ? (
        <CardBody className="text-sm text-ink-muted">{t('common.loading')}</CardBody>
      ) : query.error ? null : actions.length === 0 ? (
        <CardBody className="text-sm text-ink-muted">{t('objects.actions.empty')}</CardBody>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('objects.actions.name')}</Th>
              <Th>{t('objects.actions.label')}</Th>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody>
            {actions.map((action) => (
              <tr key={action.name} className="hover:bg-surface-muted">
                <Td className="font-mono text-xs">{action.name}</Td>
                <Td>{action.label}</Td>
                <Td>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${t('common.delete')} ${action.name}`}
                    disabled={remove.isPending}
                    onClick={() => drop(action.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <CardBody className="border-t border-border">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="action-name">{t('objects.actions.name')}</Label>
            {/* shown the way the server stores it */}
            <Input
              id="action-name"
              value={name}
              onChange={(event) => setName(event.target.value.toUpperCase())}
              placeholder="ANULAR_AJENO"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="action-label">{t('objects.actions.label')}</Label>
            <Input id="action-label" value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>
          <Button type="button" size="sm" className="mb-0.5" onClick={declare} disabled={problem !== null || create.isPending}>
            {t('objects.actions.add')}
          </Button>
        </div>
        {/* nothing typed is not worth a complaint yet */}
        {problem && name.trim() ? <p className="mt-2 text-xs text-danger">{t(`objects.actions.problems.${problem}`)}</p> : null}
      </CardBody>
    </Card>
  )
}
