import { beforeAll, describe, expect, it } from 'vitest'
import { describeChanges, formatAuditValue, relativeTime } from './changes'
import { createWasichaiI18n } from '../../i18n/createI18n'
import { issueModule } from '../../test/fakeModules'
import type { AuditEntry } from '../../types/audit'
import type { FieldMeta, ObjectDefinition } from '../../types/metadata'
import type { AuditExtensions } from './changes'

const extensions: AuditExtensions = { valueFormatters: issueModule.auditValueFormatters ?? [], fieldLabels: issueModule.auditFieldLabels ?? {} }

beforeAll(() => {
  createWasichaiI18n({ languages: ['es', 'en'], storageKey: 'changes-test.lang', modules: [issueModule] })
})

function field(name: string, label: string, type: FieldMeta['type'] = 'TEXT'): FieldMeta {
  return {
    id: name,
    name,
    label,
    type,
    required: false,
    unique: false,
    defaultValue: null,
    description: null,
    position: 0,
    enumOptions: null,
    relationTarget: null,
    geometry: null,
    visible: true,
    editable: true
  }
}

const predio: ObjectDefinition = {
  id: 'predio-id',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  geometry: { type: 'POLYGON', srid: 4326, dimension: 2 },
  fields: [field('codigo', 'Código'), field('superficie', 'Superficie', 'DECIMAL'), field('activo', 'Activo', 'BOOLEAN')]
}

function entry(changes: AuditEntry['changes']): AuditEntry {
  return {
    id: 'audit-1',
    userEmail: 'ana@wasichai.test',
    objectName: 'predio',
    recordId: 'record-1',
    operation: 'UPDATE',
    occurredAt: '2026-09-17T10:00:00Z',
    changes,
    documentId: null,
    reason: null,
    serviceAccount: null
  }
}

describe('describeChanges', () => {
  it('resolves the field label from the object definition', () => {
    const described = describeChanges(entry([{ field: 'codigo', before: 'A-1', after: 'A-2' }]), predio)
    expect(described).toHaveLength(1)
    expect(described[0].label).toBe('Código')
    expect(described[0].before).toBe('A-1')
    expect(described[0].after).toBe('A-2')
  })

  it('falls back to the technical name when the field no longer exists', () => {
    const described = describeChanges(entry([{ field: 'codigo_viejo', before: 1, after: 2 }]), predio)
    expect(described[0].label).toBe('codigo_viejo')
  })

  it('falls back to the technical name when there is no definition at all', () => {
    const described = describeChanges(entry([{ field: 'codigo', before: 'A-1', after: 'A-2' }]), undefined)
    expect(described[0].label).toBe('codigo')
  })

  it('skips fields that did not actually change', () => {
    const described = describeChanges(
      entry([
        { field: 'codigo', before: 'A-1', after: 'A-1' },
        { field: 'superficie', before: 100, after: 250 },
        { field: 'activo', before: null, after: undefined }
      ]),
      predio
    )
    expect(described.map((change) => change.field)).toEqual(['superficie'])
  })

  it('renders nulls as an em dash and booleans as yes/no', () => {
    const described = describeChanges(
      entry([
        { field: 'codigo', before: null, after: 'A-1' },
        { field: 'activo', before: true, after: false }
      ]),
      predio
    )
    expect(described[0].before).toBe('—')
    expect(described[1].before).toBe('Sí')
    expect(described[1].after).toBe('No')
  })

  it('lets a module name its own value and column instead of dumping them', () => {
    const described = describeChanges(entry([{ field: 'sketch', before: null, after: { strokes: [[0, 0, 1, 1]] } }]), predio, extensions)
    expect(described[0].label).toBe('Boceto')
    expect(described[0].after).toBe('boceto actualizado')
    expect(described[0].after).not.toContain('strokes')
  })

  it('without a module that knows it, a value is only an updated value and the column its name', () => {
    const described = describeChanges(entry([{ field: 'sketch', before: null, after: { strokes: [[0, 0, 1, 1]] } }]), predio)
    expect(described[0].label).toBe('sketch')
    expect(described[0].after).toBe('valor actualizado')
  })

  it('treats an unchanged geometry as no change', () => {
    const geometry = { type: 'Point', coordinates: [1, 2] }
    const described = describeChanges(entry([{ field: 'geometry', before: geometry, after: { ...geometry } }]), predio)
    expect(described).toHaveLength(0)
  })

  it('survives an entry without changes', () => {
    expect(describeChanges({ changes: [] }, predio)).toEqual([])
  })
})

describe('formatAuditValue', () => {
  it('renders the simple cases', () => {
    expect(formatAuditValue(undefined)).toBe('—')
    expect(formatAuditValue('')).toBe('—')
    expect(formatAuditValue('Predio 1')).toBe('Predio 1')
    expect(formatAuditValue(42)).toBe('42')
    expect(formatAuditValue(true)).toBe('Sí')
  })

  it('never dumps an object', () => {
    expect(formatAuditValue({ a: 1 })).toBe('valor actualizado')
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-09-17T12:00:00Z')

  function at(msAgo: number): string {
    return new Date(now.getTime() - msAgo).toISOString()
  }

  it('buckets seconds', () => {
    const text = relativeTime(at(30_000), now)
    expect(text).toContain('30')
    expect(text).toContain('segundo')
  })

  it('buckets minutes', () => {
    const text = relativeTime(at(5 * 60_000), now)
    expect(text).toContain('5')
    expect(text).toContain('minuto')
  })

  it('buckets hours', () => {
    const text = relativeTime(at(3 * 3_600_000), now)
    expect(text).toContain('3')
    expect(text).toContain('hora')
  })

  it('buckets days', () => {
    const text = relativeTime(at(2 * 86_400_000), now)
    expect(text).toContain('2')
    expect(text).toContain('día')
  })

  it('gives back the raw value when the date is unreadable', () => {
    expect(relativeTime('not-a-date', now)).toBe('not-a-date')
  })
})
