import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import type { ObjectDefinition, Paged, RecordItem } from '../../../types/metadata'

interface RelationFieldProps {
  target: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  // what a form's label points at, and its error and lock, as every other field has them
  id?: string
  invalid?: boolean
  disabled?: boolean
}

// related records are just records: same dynamic API, labelled by the first text field.
export function RelationField({ target, value, onChange, placeholder, id, invalid, disabled }: RelationFieldProps) {
  const definition = useQuery({
    queryKey: ['objects', target],
    queryFn: () => api<ObjectDefinition>(`/metadata/objects/${target}`)
  })
  const records = useQuery({
    queryKey: ['records', target, 'relation-options'],
    queryFn: () => api<Paged<RecordItem>>(`/objects/${target}/records?size=100`)
  })

  const labelField = definition.data?.fields.find((field) => ['TEXT', 'EMAIL', 'URL', 'ENUM'].includes(field.type))?.name

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} aria-invalid={invalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(records.data?.content ?? []).map((record) => (
          <SelectItem key={record.id} value={record.id}>
            {String((labelField && record.attributes[labelField]) ?? record.id)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
