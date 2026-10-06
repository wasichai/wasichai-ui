import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildRecordSchema, toAttributes, toFormValues } from './metadata-to-zod'
import type { FieldMeta } from '../types/metadata'

function field(overrides: Partial<FieldMeta>): FieldMeta {
  return {
    id: crypto.randomUUID(),
    name: 'codigo',
    label: 'Código',
    type: 'TEXT',
    required: false,
    unique: false,
    defaultValue: null,
    description: null,
    position: 0,
    enumOptions: null,
    relationTarget: null,
    geometry: null,
    visible: true,
    editable: true,
    ...overrides
  }
}

describe('buildRecordSchema', () => {
  it('rejects a missing required field', () => {
    const schema = buildRecordSchema([field({ required: true })])
    expect(schema.safeParse({ codigo: '' }).success).toBe(false)
    expect(schema.safeParse({ codigo: 'P-001' }).success).toBe(true)
  })

  it('allows an empty optional field', () => {
    const schema = buildRecordSchema([field({ required: false })])
    expect(schema.safeParse({ codigo: '' }).success).toBe(true)
  })

  it('coerces decimals typed as strings', () => {
    const schema = buildRecordSchema([field({ name: 'area', type: 'DECIMAL' })])
    const result = schema.safeParse({ area: '850.5' })
    expect(result.success).toBe(true)
    expect(result.data?.area).toBe(850.5)
  })

  it('rejects a decimal that is not a number', () => {
    const schema = buildRecordSchema([field({ name: 'area', type: 'DECIMAL' })])
    expect(schema.safeParse({ area: 'mucho' }).success).toBe(false)
  })

  it('restricts an enum to its options', () => {
    const schema = buildRecordSchema([field({ name: 'uso', type: 'ENUM', enumOptions: ['RESIDENCIAL', 'COMERCIAL'] })])
    expect(schema.safeParse({ uso: 'COMERCIAL' }).success).toBe(true)
    expect(schema.safeParse({ uso: 'INDUSTRIAL' }).success).toBe(false)
  })

  it('skips fields that are not editable', () => {
    const schema = buildRecordSchema([field({ editable: false, required: true })])
    expect(schema.safeParse({}).success).toBe(true)
  })
})

describe('form value mapping', () => {
  const fields = [field({ name: 'codigo' }), field({ name: 'activo', type: 'BOOLEAN' })]

  it('turns empty values into nulls for the API', () => {
    expect(toAttributes(fields, { codigo: '', activo: true })).toEqual({
      codigo: null,
      activo: true
    })
  })

  it('round-trips API attributes into form values', () => {
    expect(toFormValues(fields, { codigo: 'P-001' })).toEqual({
      codigo: 'P-001',
      activo: false
    })
  })
})

// the api sends an instant in utc; datetime-local works in the browser's wall time
describe('DATETIME form values', () => {
  const cita = [field({ name: 'cita', type: 'DATETIME' })]
  beforeEach(() => vi.stubEnv('TZ', 'America/Lima'))
  afterEach(() => vi.unstubAllEnvs())

  it('shows the instant in local time', () => {
    expect(toFormValues(cita, { cita: '2026-10-06T14:30:00Z' })).toEqual({ cita: '2026-10-06T09:30' })
  })

  it('saves an untouched value back as the same instant, however often', () => {
    let stored: unknown = '2026-10-06T14:30:00Z'
    for (let save = 0; save < 3; save++) stored = toAttributes(cita, toFormValues(cita, { cita: stored })).cita
    expect(stored).toBe('2026-10-06T14:30:00.000Z')
  })

  it('crosses midnight into the local day', () => {
    expect(toFormValues(cita, { cita: '2026-10-07T02:15:00Z' })).toEqual({ cita: '2026-10-06T21:15' })
  })

  it('leaves a value it cannot read as before', () => {
    expect(toFormValues(cita, { cita: 'mañana temprano' })).toEqual({ cita: 'mañana temprano' })
  })
})
