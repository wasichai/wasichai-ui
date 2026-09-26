import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { Badge, Table, Td, Th } from '@wasichai/ui'
import { useCreateRelationship, useDeleteRelationship, useObjects, useRelationships, useUpdateRelationship } from '../../queries'
import type { RelationshipType } from '../../types/metadata'
import { describeError } from './objectDraft'
import { sidesOf } from './relationshipSides'
import { useWasichaiLinks } from '../../app/context'

const TYPES: RelationshipType[] = ['MANY_TO_ONE', 'ONE_TO_MANY', 'ONE_TO_ONE', 'MANY_TO_MANY']

interface Draft {
  name: string
  label: string
  inverseLabel: string
  type: RelationshipType
  target: string
  fieldName: string
}

function emptyDraft(): Draft {
  return { name: '', label: '', inverseLabel: '', type: 'MANY_TO_ONE', target: '', fieldName: '' }
}

// the relationships this object takes part in, from either side. the whole org's list is small and
// carries everything an editor needs; the per-object endpoint does not say which side you are on.
export function ObjectRelationships({ objectName }: { objectName: string }) {
  const { t } = useTranslation()
  const links = useWasichaiLinks()
  const { data: relationships = [] } = useRelationships()
  const { data: objects = [] } = useObjects()
  const create = useCreateRelationship()
  const update = useUpdateRelationship()
  const remove = useDeleteRelationship()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sides = sidesOf(relationships, objectName)

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  const submit = () => {
    if (!draft || !draft.name.trim() || !draft.target) return
    void run(async () => {
      await create.mutateAsync({
        name: draft.name.trim().toLowerCase(),
        label: draft.label.trim() || draft.name.trim(),
        inverseLabel: draft.inverseLabel.trim() || null,
        type: draft.type,
        // standing inside an object, it is always this end that is asking
        source: objectName,
        target: draft.target,
        fieldName: draft.fieldName.trim() || null
      })
      setDraft(null)
    })
  }

  // where the column lands is the one thing that is not obvious from the type's name
  const columnHint = (type: RelationshipType, target: string) => {
    if (type === 'MANY_TO_MANY') return t('relationships.columnJoinTable')
    const here = type === 'MANY_TO_ONE' || type === 'ONE_TO_ONE'
    return t(here ? 'relationships.columnHere' : 'relationships.columnThere', { object: here ? objectName : target || '…' })
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{t('relationships.title')}</CardTitle>
        <Button type="button" variant="secondary" size="sm" onClick={() => setDraft(draft ? null : emptyDraft())}>
          <Plus className="h-4 w-4" />
          {t('relationships.new')}
        </Button>
      </CardHeader>

      {error ? <CardBody className="border-b border-border py-3 text-sm text-danger">{error}</CardBody> : null}

      {draft ? (
        <CardBody className="border-b border-border">
          <div className="grid items-end gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>{t('objects.name')}</Label>
              <Input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="titular"
                aria-label={t('objects.name')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('relationships.label')}</Label>
              <Input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} aria-label={t('relationships.label')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('relationships.inverseLabel')}</Label>
              <Input
                value={draft.inverseLabel}
                onChange={(event) => setDraft({ ...draft, inverseLabel: event.target.value })}
                aria-label={t('relationships.inverseLabel')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('relationships.type')}</Label>
              <Select value={draft.type} onValueChange={(value) => setDraft({ ...draft, type: value as RelationshipType })}>
                <SelectTrigger aria-label={t('relationships.type')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t('relationships.with')}</Label>
              <Select value={draft.target} onValueChange={(value) => setDraft({ ...draft, target: value })}>
                <SelectTrigger aria-label={t('relationships.with')}>
                  <SelectValue placeholder={t('map.selectObject')} />
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

            {draft.type === 'MANY_TO_MANY' ? null : (
              <div className="space-y-1.5">
                <Label>{t('relationships.fieldName')}</Label>
                <Input
                  value={draft.fieldName}
                  onChange={(event) => setDraft({ ...draft, fieldName: event.target.value })}
                  aria-label={t('relationships.fieldName')}
                />
              </div>
            )}

            <div className="flex gap-2 sm:col-span-4">
              <Button type="button" size="sm" onClick={submit} disabled={create.isPending || !draft.name.trim() || !draft.target}>
                {t('common.create')}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setDraft(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-muted">{columnHint(draft.type, draft.target)}</p>
        </CardBody>
      ) : null}

      {sides.length === 0 ? (
        <CardBody className="text-sm text-ink-muted">{t('relationships.emptyForObject', { object: objectName })}</CardBody>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('relationships.label')}</Th>
              <Th>{t('relationships.inverseLabel')}</Th>
              <Th>{t('relationships.type')}</Th>
              <Th>{t('relationships.with')}</Th>
              <Th>{t('relationships.backing')}</Th>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody>
            {sides.map(({ relationship, outgoing, otherObject, ownField }) => (
              <tr key={relationship.id} className="hover:bg-surface-muted">
                <Td>
                  {/* on blur, not on change: one PUT per keystroke would be a PUT per keystroke */}
                  <Input
                    key={relationship.label}
                    defaultValue={relationship.label}
                    aria-label={t('relationships.labelOf', { name: relationship.name })}
                    onBlur={(event) => {
                      const next = event.target.value.trim()
                      if (next && next !== relationship.label) {
                        void run(() => update.mutateAsync({ name: relationship.name, payload: { label: next } }))
                      }
                    }}
                  />
                </Td>
                <Td>
                  <Input
                    key={relationship.inverseLabel ?? ''}
                    defaultValue={relationship.inverseLabel ?? ''}
                    aria-label={t('relationships.inverseLabelOf', { name: relationship.name })}
                    onBlur={(event) => {
                      const next = event.target.value.trim()
                      if (next !== (relationship.inverseLabel ?? '')) {
                        void run(() => update.mutateAsync({ name: relationship.name, payload: { inverseLabel: next || null } }))
                      }
                    }}
                  />
                </Td>
                <Td>
                  <Badge>{relationship.type}</Badge>
                  <p className="mt-1 text-xs text-ink-muted">{t(outgoing ? 'relationships.outgoing' : 'relationships.incoming')}</p>
                </Td>
                <Td>
                  <Link className="text-sm text-brand hover:underline" to={links.editObject(otherObject)}>
                    {otherObject}
                  </Link>
                </Td>
                {/* a column on the other object is qualified, so nobody reads it as one of ours */}
                <Td className="font-mono text-xs text-ink-muted">
                  {ownField ?? relationship.joinTable ?? (relationship.fieldName ? `${otherObject}.${relationship.fieldName}` : '—')}
                </Td>
                <Td>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${t('common.delete')} ${relationship.name}`}
                    onClick={() => {
                      if (window.confirm(t('relationships.confirmDelete'))) void run(() => remove.mutateAsync(relationship.name))
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}
