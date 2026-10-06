import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../shell/PageHeader'
import { Button } from '@wasichai/ui'
import { Card, CardBody, CardHeader, CardTitle } from '@wasichai/ui'
import { Input } from '@wasichai/ui'
import { Label } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { Badge, Table, Td, Th } from '@wasichai/ui'
import { describeError } from '../../api/client'
import { useCreateRelationship, useDeleteRelationship, useObjects, useRelationships } from '../../queries'
import type { RelationshipType } from '../../types/metadata'

const TYPES: RelationshipType[] = ['MANY_TO_ONE', 'ONE_TO_MANY', 'ONE_TO_ONE', 'MANY_TO_MANY']

export function RelationshipsPage() {
  const { t } = useTranslation()
  const { data: relationships = [], isLoading } = useRelationships()
  const { data: objects = [] } = useObjects()
  const create = useCreateRelationship()
  const remove = useDeleteRelationship()

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [inverseLabel, setInverseLabel] = useState('')
  const [type, setType] = useState<RelationshipType>('MANY_TO_ONE')
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [fieldName, setFieldName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      await create.mutateAsync({
        name: name.trim().toLowerCase(),
        label: label.trim() || name.trim(),
        inverseLabel: inverseLabel.trim() || null,
        type,
        source,
        target,
        fieldName: fieldName.trim() || null
      })
      setName('')
      setLabel('')
      setInverseLabel('')
      setFieldName('')
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  return (
    <>
      <PageHeader title={t('relationships.title')} subtitle={t('relationships.subtitle')} />

      <div className="space-y-5 p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('relationships.new')}</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={submit} className="grid items-end gap-4 sm:grid-cols-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="rel-name">{t('objects.name')}</Label>
                <Input id="rel-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="predio_titular" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-label">{t('relationships.label')}</Label>
                <Input id="rel-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Titular" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-inverse">{t('relationships.inverseLabel')}</Label>
                <Input id="rel-inverse" value={inverseLabel} onChange={(event) => setInverseLabel(event.target.value)} placeholder="Predios" />
              </div>

              <div className="space-y-1.5">
                <Label>{t('relationships.type')}</Label>
                <Select value={type} onValueChange={(value) => setType(value as RelationshipType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('relationships.source')}</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
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
              <div className="space-y-1.5">
                <Label>{t('relationships.target')}</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
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

              {type !== 'MANY_TO_MANY' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="rel-field">{t('relationships.fieldName')}</Label>
                  <Input id="rel-field" value={fieldName} onChange={(event) => setFieldName(event.target.value)} placeholder="titular" />
                  <p className="text-xs text-ink-muted">{t('relationships.fieldHint')}</p>
                </div>
              ) : null}

              <div className="sm:col-span-3">
                {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}
                <Button type="submit" disabled={!source || !target || create.isPending}>
                  <Plus className="h-4 w-4" />
                  {t('common.create')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          {isLoading ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('common.loading')}</p>
          ) : relationships.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-muted">{t('relationships.empty')}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t('relationships.label')}</Th>
                  <Th>{t('relationships.type')}</Th>
                  <Th>{t('relationships.source')}</Th>
                  <Th>{t('relationships.target')}</Th>
                  <Th>{t('relationships.fieldName')}</Th>
                  <Th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {relationships.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-muted">
                    <Td className="font-medium">{item.label}</Td>
                    <Td>
                      <Badge>{item.type}</Badge>
                    </Td>
                    <Td className="font-mono text-xs">{item.source}</Td>
                    <Td className="font-mono text-xs">{item.target}</Td>
                    <Td className="font-mono text-xs text-ink-muted">{item.fieldName ?? item.joinTable ?? '—'}</Td>
                    <Td>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('common.delete')}
                        onClick={() => {
                          if (window.confirm(t('relationships.confirmDelete'))) {
                            remove.mutate(item.name)
                          }
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
      </div>
    </>
  )
}
