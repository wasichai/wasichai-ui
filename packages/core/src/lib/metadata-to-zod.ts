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

// where DATETIME wall times live. timeZone is an IANA name; unset = the browser's zone
export interface DateTimeOptions {
  timeZone?: string
}

// form values -> api attributes. datetime-local needs an offset before it is ISO.
export function toAttributes(fields: FieldMeta[], values: Record<string, unknown>, options: DateTimeOptions = {}): Record<string, unknown> {
  const attributes: Record<string, unknown> = {}
  for (const field of fields) {
    if (!field.editable) continue
    const value = values[field.name]
    if (value === undefined || value === '') {
      attributes[field.name] = null
      continue
    }
    attributes[field.name] = field.type === 'DATETIME' && typeof value === 'string' && !value.endsWith('Z') ? toInstant(value, options.timeZone) : value
  }
  return attributes
}

export function toFormValues(fields: FieldMeta[], attributes: Record<string, unknown> = {}, options: DateTimeOptions = {}): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of fields) {
    const value = attributes[field.name]
    if (field.type === 'BOOLEAN') values[field.name] = value ?? false
    else if (field.type === 'DATETIME' && typeof value === 'string') values[field.name] = toLocalInput(value, options.timeZone)
    else values[field.name] = value ?? ''
  }
  return values
}

// api instant (utc) -> datetime-local wall time. cutting the Z off instead showed utc as local, and
// toAttributes then read it back as local: every save moved the value by the browser's offset
function toLocalInput(value: string, timeZone?: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 16)
  const offset = timeZone ? zoneOffset(date.getTime(), timeZone) : -date.getTimezoneOffset() * 60_000
  const local = new Date(date.getTime() + offset).toISOString()
  // seconds written by the api or an automation are kept; the input shows minutes otherwise
  return local.slice(17, 19) === '00' ? local.slice(0, 16) : local.slice(0, 19)
}

// datetime-local wall time -> api instant. without a zone, Date reads it in the browser's
function toInstant(value: string, timeZone?: string): string {
  if (!timeZone) return new Date(value).toISOString()
  // the wall time read as utc, then moved by the zone's offset. a second pass takes the offset in
  // force at the result, so a dst change between the two is caught; a repeated wall time takes the earlier instant
  const wall = new Date(`${value}Z`).getTime()
  if (Number.isNaN(wall)) return new Date(value).toISOString()
  let instant = wall - zoneOffset(wall, timeZone)
  instant = wall - zoneOffset(instant, timeZone)
  return new Date(instant).toISOString()
}

// ms to add to an instant to get the zone's wall time at that instant
function zoneOffset(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    zoneFormat(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type, Number(part.value)])
  )
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second)
  return wall - Math.floor(instant / 1000) * 1000
}

// Intl.DateTimeFormat is slow to build; one per zone
const formats = new Map<string, Intl.DateTimeFormat>()
function zoneFormat(timeZone: string): Intl.DateTimeFormat {
  let format = formats.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    formats.set(timeZone, format)
  }
  return format
}
