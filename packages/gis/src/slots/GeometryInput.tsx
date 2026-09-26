import type { FieldInputProps } from '@wasichai/core'
import { GeometryField } from '../components/GeometryField'
import { asGeometry, fieldGeometry } from '../types'

// a geometry is a field, so it is drawn where the author put it instead of trailing the form
export function GeometryInput({ field, value, onChange }: FieldInputProps) {
  const meta = fieldGeometry(field)
  return (
    <GeometryField
      name={field.name}
      label={field.label}
      geometryType={meta?.type ?? ''}
      srid={meta?.srid ?? 4326}
      value={asGeometry(value)}
      onChange={onChange}
    />
  )
}
