import { describe, expect, it } from 'vitest'
import type { SystemField } from '../../types/metadata'
import { addableFieldTypes, emptyFieldDraft, fieldPayload, nameTaken, scopeOf } from './objectDraft'
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
})
