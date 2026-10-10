import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '@wasichai/ui'
import type { FieldRenderer } from '../../registry/contract'
import type { FieldMeta } from '../../types/metadata'
import { fieldSetProblem, parseFieldSet, type FieldSetKind } from './objectDraft'

interface ObjectFieldSetsProps {
  fields: FieldMeta[]
  indexes: string[][]
  uniqueConstraints: string[][]
  renderers: Readonly<Record<string, FieldRenderer>>
  onChange: (kind: FieldSetKind, sets: string[][]) => void
  onSave: () => void
  saving: boolean
}

// composite indexes and uniques (ADR-036, ADR-037). edits stay in the page's draft until saved,
// and go out with the object's PUT, which replaces a list whole.
export function ObjectFieldSets({ fields, indexes, uniqueConstraints, renderers, onChange, onSave, saving }: ObjectFieldSetsProps) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>
          {t('objects.indexes.title')} · {t('objects.uniqueConstraints.title')}
        </CardTitle>
        <Button type="button" size="sm" onClick={onSave} disabled={saving}>
          {t('common.save')}
        </Button>
      </CardHeader>
      <CardBody className="grid gap-6 sm:grid-cols-2">
        <FieldSetList kind="indexes" sets={indexes} fields={fields} renderers={renderers} onChange={(sets) => onChange('indexes', sets)} />
        <FieldSetList
          kind="uniqueConstraints"
          sets={uniqueConstraints}
          fields={fields}
          renderers={renderers}
          onChange={(sets) => onChange('uniqueConstraints', sets)}
        />
      </CardBody>
    </Card>
  )
}

interface FieldSetListProps {
  kind: FieldSetKind
  sets: string[][]
  fields: FieldMeta[]
  renderers: Readonly<Record<string, FieldRenderer>>
  onChange: (sets: string[][]) => void
}

function FieldSetList({ kind, sets, fields, renderers, onChange }: FieldSetListProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const set = parseFieldSet(text)
  const problem = fieldSetProblem(set, kind, fields, sets, renderers)

  const add = () => {
    if (problem) return
    onChange([...sets, set])
    setText('')
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{t(`objects.${kind}.title`)}</h3>
      <p className="text-xs text-ink-muted">{t(`objects.${kind}.hint`)}</p>
      {sets.length ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {sets.map((entry) => {
            const names = entry.join(', ')
            return (
              <li key={names} className="flex items-center justify-between px-3 py-1.5">
                <span className="font-mono text-xs">{names}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${t('objects.fieldSets.remove')} ${names}`}
                  onClick={() => onChange(sets.filter((other) => other !== entry))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            )
          })}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            add()
          }}
          placeholder="anio, predio"
          aria-label={t(`objects.${kind}.add`)}
          className="font-mono"
        />
        <Button type="button" size="sm" variant="secondary" onClick={add} disabled={problem !== null}>
          <Plus className="h-4 w-4" />
          {t(`objects.${kind}.add`)}
        </Button>
      </div>
      {/* nothing typed is not worth a complaint yet */}
      {problem && text.trim() ? <p className="text-xs text-danger">{t(`objects.fieldSets.problems.${problem.code}`, { name: problem.value })}</p> : null}
    </section>
  )
}
