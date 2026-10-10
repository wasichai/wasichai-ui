import { describe, expect, it } from 'vitest'
import type { FieldMeta, ObjectDefinition, SystemField } from '../../types/metadata'
import {
  actionNameProblem,
  addableFieldTypes,
  detailsDraft,
  emptyFieldDraft,
  fieldPayload,
  fieldSetProblem,
  indexable,
  nameTaken,
  timeZoneProblem,
  objectUpdatePayload,
  parseFieldSet,
  rebaseDetails,
  scopeOf,
  type FieldSetKind
} from './objectDraft'
import { sketchModule } from '../../test/fakeModules'

const system: SystemField[] = [
  { name: 'created_at', type: 'DATETIME', scope: 'ALWAYS' },
  { name: 'workflow_state', type: 'TEXT', scope: 'WORKFLOW' },
  { name: 'version', type: null, scope: 'RESERVED' }
]

describe('objectDraft', () => {
  const renderers = sketchModule.fieldRenderers ?? {}

  it('offers the core types, then what installed modules add', () => {
    expect(addableFieldTypes({})).toEqual([
      'TEXT',
      'LONG_TEXT',
      'INTEGER',
      'DECIMAL',
      'BOOLEAN',
      'DATE',
      'DATETIME',
      'ENUM',
      'EMAIL',
      'URL',
      'UUID',
      'RELATION'
    ])
    expect(addableFieldTypes(renderers).at(-1)).toBe('SKETCH')
  })

  it('starts a field on TEXT, with every module default ready for when its type is picked', () => {
    expect(emptyFieldDraft(renderers)).toEqual({
      name: '',
      label: '',
      type: 'TEXT',
      required: false,
      unique: false,
      enumOptions: '',
      relationTarget: '',
      indexed: false,
      timeZone: '',
      settings: { strokeWidth: '2' }
    })
    expect(emptyFieldDraft().settings).toEqual({})
  })

  it('builds the api payload, with module settings only for the module type', () => {
    const draft = { ...emptyFieldDraft(renderers), name: ' Croquis ', type: 'SKETCH', settings: { strokeWidth: '4' } }
    expect(fieldPayload(draft, renderers)).toEqual({
      name: 'croquis',
      label: 'Croquis',
      type: 'SKETCH',
      required: false,
      unique: false,
      enumOptions: null,
      relationTarget: null,
      strokeWidth: 4
    })
    expect(fieldPayload({ ...draft, type: 'ENUM', enumOptions: 'A, B,' }, renderers)).toEqual({
      name: 'croquis',
      label: 'Croquis',
      type: 'ENUM',
      required: false,
      unique: false,
      enumOptions: ['A', 'B'],
      relationTarget: null
    })
  })

  it('refuses a name the platform owns', () => {
    expect(nameTaken('created_at', [], system)).toEqual({ code: 'SYSTEM', value: 'created_at' })
  })

  // the server lower-cases and trims before it validates, so anything else would refuse late
  it('refuses that name however it was typed', () => {
    expect(nameTaken('  Created_At ', [], system)).toEqual({ code: 'SYSTEM', value: 'created_at' })
  })

  it('refuses a name another field already has', () => {
    expect(nameTaken('revisado', [{ name: 'revisado' }], system)).toEqual({ code: 'DUPLICATE', value: 'revisado' })
  })

  it('lets a free name through, and says nothing about an empty one', () => {
    expect(nameTaken('superficie', [{ name: 'revisado' }], system)).toBeNull()
    expect(nameTaken('   ', [], system)).toBeNull()
  })

  // saying "only with a workflow" about a table that has the column would be a plain lie
  it('calls a conditional column a system column where the condition is already met', () => {
    const state = system[1]
    expect(scopeOf(state, true)).toBe('ALWAYS')
    expect(scopeOf(state, false)).toBe('WORKFLOW')
  })

  it('leaves a name reserved for nothing reserved, whatever the object is', () => {
    expect(scopeOf(system[2], true)).toBe('RESERVED')
  })

  it('sends indexed only when asked', () => {
    expect(fieldPayload({ ...emptyFieldDraft(), name: 'a', indexed: true }, {})).toMatchObject({ indexed: true })
    expect(fieldPayload({ ...emptyFieldDraft(), name: 'a' }, {})).not.toHaveProperty('indexed')
    // ticked, then switched to a type the server will not index
    expect(fieldPayload({ ...emptyFieldDraft(), name: 'a', type: 'LONG_TEXT', indexed: true }, {})).not.toHaveProperty('indexed')
  })
})

function field(name: string, type: string): FieldMeta {
  return {
    id: name,
    name,
    label: name,
    type,
    required: false,
    unique: false,
    defaultValue: null,
    description: null,
    position: 0,
    enumOptions: null,
    relationTarget: null,
    visible: true,
    editable: true
  }
}

const fields = [field('anio', 'INTEGER'), field('mes', 'INTEGER'), field('codigo', 'TEXT'), field('notas', 'LONG_TEXT'), field('croquis', 'SKETCH')]

const base: ObjectDefinition = { id: 'o1', name: 'cuota', label: 'Cuota', pluralLabel: 'Cuotas', description: null, enabled: true, fields }

describe('object details draft', () => {
  const definition: ObjectDefinition = { ...base, appendOnly: true, apiOnly: false, requiresReason: false, indexes: [['anio', 'mes']] }

  // saving the labels must not reset a rule or a list nobody touched
  it('sends no write rule or list the editor did not change', () =>
    expect(objectUpdatePayload(definition, detailsDraft(definition))).toEqual({ label: 'Cuota', pluralLabel: 'Cuotas', description: null, enabled: true }))

  it('sends a flag the editor switched', () =>
    expect(objectUpdatePayload(definition, { ...detailsDraft(definition), appendOnly: false })).toMatchObject({ appendOnly: false }))

  it('sends the whole list when it changed, [] to drop them', () => {
    expect(objectUpdatePayload(definition, { ...detailsDraft(definition), indexes: [] })).toMatchObject({ indexes: [] })
    expect(objectUpdatePayload(definition, { ...detailsDraft(definition), uniqueConstraints: [['anio', 'codigo']] })).toMatchObject({
      uniqueConstraints: [['anio', 'codigo']]
    })
  })

  it('reads a server that sends no flags as all off', () =>
    expect(detailsDraft({ ...base })).toMatchObject({ appendOnly: false, apiOnly: false, requiresReason: false, indexes: [], uniqueConstraints: [] }))

  it('keeps what the editor changed across a refetch and takes the rest from the server', () => {
    const before = detailsDraft(definition)
    const current = { ...before, appendOnly: false, uniqueConstraints: [['anio', 'codigo']] }
    const next = { ...detailsDraft(definition), requiresReason: true, label: 'Cuota mensual' }
    expect(rebaseDetails(current, before, next)).toEqual({ ...next, appendOnly: false, uniqueConstraints: [['anio', 'codigo']] })
  })

  it('trims the labels and falls back the way the form always did', () =>
    expect(objectUpdatePayload(base, { ...detailsDraft(base), label: ' Pago ', pluralLabel: ' ', description: ' ' })).toEqual({
      label: 'Pago',
      pluralLabel: 'Pago',
      description: null,
      enabled: true
    }))
})

describe('field sets', () => {
  const renderers = sketchModule.fieldRenderers ?? {}

  it('parses a typed set the way the server normalises it', () => expect(parseFieldSet(' Anio , ,MES ')).toEqual(['anio', 'mes']))

  it.each<[string[], FieldSetKind, string]>([
    [[], 'indexes', 'EMPTY'],
    [['anio', 'anio'], 'indexes', 'REPEATED_FIELD'],
    [['nope'], 'indexes', 'UNKNOWN'],
    [['notas'], 'indexes', 'NOT_INDEXABLE'],
    [['anio'], 'uniqueConstraints', 'TOO_FEW'],
    [['anio', 'mes'], 'indexes', 'DUPLICATE_SET']
  ])('refuses %j as %s: %s', (set, kind, code) => expect(fieldSetProblem(set, kind, fields, [['anio', 'mes']], {})?.code).toBe(code))

  it('names the field a problem is about', () => {
    expect(fieldSetProblem(['anio', 'nope'], 'indexes', fields, [], {})).toEqual({ code: 'UNKNOWN', value: 'nope' })
    expect(fieldSetProblem(['mes', 'mes'], 'indexes', fields, [], {})).toEqual({ code: 'REPEATED_FIELD', value: 'mes' })
  })

  // the server refuses these whatever renderers are installed; gis's own type says so through its renderer
  it.each(['LONG_TEXT', 'FILE', 'IMAGE'])('says %s cannot be indexed', (type) => expect(indexable(type, {})).toBe(false))

  it('refuses a module type that cannot be unique', () =>
    expect(fieldSetProblem(['croquis', 'anio'], 'indexes', fields, [], renderers)).toEqual({ code: 'NOT_INDEXABLE', value: 'croquis' }))

  it('accepts one field as an index', () => expect(fieldSetProblem(['anio'], 'indexes', fields, [], {})).toBeNull())

  it('accepts the same fields in another order', () => expect(fieldSetProblem(['mes', 'anio'], 'indexes', fields, [['anio', 'mes']], {})).toBeNull())

  it('refuses more than 32 fields', () => {
    const many = Array.from({ length: 33 }, (_, index) => field(`f${index}`, 'TEXT'))
    const names = many.map((item) => item.name)
    expect(fieldSetProblem(names, 'indexes', many, [], {})?.code).toBe('TOO_MANY')
    expect(fieldSetProblem(names.slice(0, 32), 'uniqueConstraints', many, [], {})).toBeNull()
  })
})

describe('declared action names', () => {
  // the server upper-cases what it is sent, so lower case typed is fine
  it('accepts an upper snake name however it was typed', () => expect(actionNameProblem('anular_ajeno', [])).toBeNull())

  it('refuses a built-in action', () => expect(actionNameProblem('MANAGE_TENANTS', [])).toBe('BUILT_IN'))

  it('refuses a bad shape', () => {
    expect(actionNameProblem('X', [])).toBe('SHAPE')
    expect(actionNameProblem('1ABC', [])).toBe('SHAPE')
    expect(actionNameProblem('A'.repeat(50), [])).toBe('SHAPE')
  })

  it('refuses a name the object already declares', () => expect(actionNameProblem('anular', [{ name: 'ANULAR', label: 'x' }])).toBe('DUPLICATE'))

  // the server keeps it off the json when unset and refuses it on any other type
  it('sends a time zone only on a DATETIME field that has one', () => {
    const draft = { ...emptyFieldDraft(), name: 'plazo', type: 'DATETIME', timeZone: ' America/Lima ' }
    expect(fieldPayload(draft, {})).toMatchObject({ timeZone: 'America/Lima' })
    expect(fieldPayload({ ...draft, timeZone: '' }, {})).not.toHaveProperty('timeZone')
    // typed, then switched to a type the server refuses it on
    expect(fieldPayload({ ...draft, type: 'DATE' }, {})).not.toHaveProperty('timeZone')
  })

  it('takes a blank or an IANA name as a time zone, nothing else', () => {
    expect(timeZoneProblem('')).toBe(false)
    expect(timeZoneProblem(' America/Lima ')).toBe(false)
    expect(timeZoneProblem('America/Limaa')).toBe(true)
  })
})
