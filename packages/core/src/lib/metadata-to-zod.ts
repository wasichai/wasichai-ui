import { z } from 'zod'
import type { FieldMeta } from '../types/metadata'

// empty inputs are "not provided", not "empty string"
function blankToUndefined(value: unknown): unknown {
  return value === '' || value === null ? undefined : value
}

function toNumber(value: unknown): unknown {
  const cleaned = blankToUndefined(value)
  if (typeof cleaned === 'string') {
    const parsed = Number(cleaned)
    return Number.isNaN(parsed) ? cleaned : parsed
  }
  return cleaned
}

function optional(schema: z.ZodTypeAny, required: boolean): z.ZodTypeAny {
  return required ? schema : schema.optional()
}

// metadata -> validation. the form never hardcodes a rule per object.
export function fieldSchema(field: FieldMeta): z.ZodTypeAny {
  const label = field.label || field.name
  const requiredMessage = `${label}: required`

  switch (field.type) {
    case 'LONG_TEXT':
    case 'TEXT':
    case 'UUID':
      return z.preprocess(blankToUndefined, optional(z.string({ error: requiredMessage }).min(1, requiredMessage), field.required))
    case 'EMAIL':
      return z.preprocess(blankToUndefined, optional(z.string({ error: requiredMessage }).email(`${label}: invalid email`), field.required))
    case 'URL':
      return z.preprocess(blankToUndefined, optional(z.string({ error: requiredMessage }).url(`${label}: invalid URL`), field.required))
    case 'ENUM': {
      const options = field.enumOptions ?? []
      return z.preprocess(
        blankToUndefined,
        optional(
          z.string({ error: requiredMessage }).refine((value) => options.includes(value), {
            error: `${label}: invalid option`
          }),
          field.required
        )
      )
    }
    case 'INTEGER':
      return z.preprocess(toNumber, optional(z.number({ error: requiredMessage }).int(`${label}: must be an integer`), field.required))
    case 'DECIMAL':
      return z.preprocess(toNumber, optional(z.number({ error: requiredMessage }), field.required))
    case 'BOOLEAN':
      return z.preprocess((value) => value ?? false, z.boolean())
    case 'DATE':
      return z.preprocess(
        blankToUndefined,
        optional(
          z.string({ error: requiredMessage }).refine((value) => !Number.isNaN(Date.parse(value)), {
            error: `${label}: invalid date`
          }),
          field.required
        )
      )
    case 'DATETIME':
      return z.preprocess(
        blankToUndefined,
        optional(
          z.string({ error: requiredMessage }).refine((value) => !Number.isNaN(Date.parse(value)), {
            error: `${label}: invalid date-time`
          }),
          field.required
        )
      )
    case 'RELATION':
      return z.preprocess(blankToUndefined, optional(z.string({ error: requiredMessage }).uuid(`${label}: invalid reference`), field.required))
    default:
      return z.preprocess(blankToUndefined, z.unknown().optional())
  }
}

export function buildRecordSchema(fields: FieldMeta[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of fields) {
    if (!field.editable) continue
    shape[field.name] = fieldSchema(field)
  }
  return z.object(shape)
}

// form values -> api attributes. datetime-local needs an offset before it is ISO.
export function toAttributes(fields: FieldMeta[], values: Record<string, unknown>): Record<string, unknown> {
  const attributes: Record<string, unknown> = {}
  for (const field of fields) {
    if (!field.editable) continue
    const value = values[field.name]
    if (value === undefined || value === '') {
      attributes[field.name] = null
      continue
    }
    attributes[field.name] = field.type === 'DATETIME' && typeof value === 'string' && !value.endsWith('Z') ? new Date(value).toISOString() : value
  }
  return attributes
}

export function toFormValues(fields: FieldMeta[], attributes: Record<string, unknown> = {}): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of fields) {
    const value = attributes[field.name]
    if (field.type === 'BOOLEAN') values[field.name] = value ?? false
    else if (field.type === 'DATETIME' && typeof value === 'string') values[field.name] = value.slice(0, 16)
    else values[field.name] = value ?? ''
  }
  return values
}
