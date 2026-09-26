import { describe, expect, it } from 'vitest'
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
