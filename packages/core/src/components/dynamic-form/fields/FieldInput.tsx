import { Controller, type Control, type UseFormRegister } from 'react-hook-form'
import { Input, Textarea } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { RelationField } from './RelationField'
import type { FieldMeta } from '../../../types/metadata'

type Values = Record<string, unknown>

interface FieldInputProps {
  field: FieldMeta
  control: Control<Values>
  register: UseFormRegister<Values>
  invalid: boolean
}

// one switch, every object. no per-object form component exists anywhere. ADR-003.
export function FieldInput({ field, control, register, invalid }: FieldInputProps) {
  const common = { id: field.name, 'aria-invalid': invalid }

  switch (field.type) {
    case 'LONG_TEXT':
      return <Textarea {...common} {...register(field.name)} />
    case 'INTEGER':
      return <Input {...common} type="number" step="1" {...register(field.name)} />
    case 'DECIMAL':
      return <Input {...common} type="number" step="any" {...register(field.name)} />
    case 'DATE':
      return <Input {...common} type="date" {...register(field.name)} />
    case 'DATETIME':
      return <Input {...common} type="datetime-local" {...register(field.name)} />
    case 'EMAIL':
      return <Input {...common} type="email" {...register(field.name)} />
    case 'URL':
      return <Input {...common} type="url" {...register(field.name)} />
    case 'BOOLEAN':
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: controlled }) => (
            <input
              id={field.name}
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={Boolean(controlled.value)}
              onChange={(event) => controlled.onChange(event.target.checked)}
            />
          )}
        />
      )
    case 'ENUM':
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: controlled }) => (
            <Select value={(controlled.value as string) ?? ''} onValueChange={controlled.onChange}>
              <SelectTrigger aria-invalid={invalid} id={field.name}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {(field.enumOptions ?? []).map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )
    case 'RELATION':
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: controlled }) => (
            <RelationField target={field.relationTarget ?? ''} value={(controlled.value as string) ?? ''} onChange={controlled.onChange} />
          )}
        />
      )
    default:
      return <Input {...common} {...register(field.name)} />
  }
}
