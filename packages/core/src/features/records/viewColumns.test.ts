import { describe, expect, it } from 'vitest'
import { effectiveSort, fallbackView, pickView, viewColumns, viewQueryParams } from './viewColumns'
import type { FieldMeta, View, ViewDefinition } from '../../types/metadata'

function field(name: string, visible = true): FieldMeta {
  return {
    id: name,
    name,
    label: name,
    type: 'TEXT',
    required: false,
    unique: false,
    defaultValue: null,
    description: null,
    position: 0,
    enumOptions: null,
    relationTarget: null,
    geometry: null,
    visible,
    editable: true
  }
}

const fields = [field('codigo'), field('area'), field('nombre')]

function definition(overrides: Partial<ViewDefinition> = {}): ViewDefinition {
  return { columns: [], filters: {}, sort: null, pageSize: 25, ...overrides }
}

const query = { page: 0, search: '', sort: '', descending: false }

describe('viewColumns', () => {
  it('keeps the columns in the order the view declares', () => {
    const columns = viewColumns(definition({ columns: ['nombre', 'codigo'] }), fields)
    expect(columns).toEqual(['nombre', 'codigo'])
  })

  it('skips a column naming a field that no longer exists', () => {
    const columns = viewColumns(definition({ columns: ['nombre', 'fantasma', 'area'] }), fields)
    expect(columns).toEqual(['nombre', 'area'])
  })

  it('returns nothing when the view names no surviving field', () => {
    expect(viewColumns(definition({ columns: ['fantasma'] }), fields)).toEqual([])
  })
})

describe('viewQueryParams', () => {
  it('turns filters into equality params', () => {
    const params = viewQueryParams(definition({ filters: { uso: 'RESIDENCIAL', estado: 'ACTIVO' } }), query)
    expect(params.uso).toBe('RESIDENCIAL')
    expect(params.estado).toBe('ACTIVO')
  })

  it('drops a filter with an empty value', () => {
    const params = viewQueryParams(definition({ filters: { uso: '' } }), query)
    expect(params.uso).toBeUndefined()
  })

  it('turns the view sort into sort and dir', () => {
    const params = viewQueryParams(definition({ sort: { field: 'area', direction: 'DESC' } }), query)
    expect(params.sort).toBe('area')
    expect(params.dir).toBe('desc')
  })

  it('sends no sort when the view has none', () => {
    const params = viewQueryParams(definition(), query)
    expect(params.sort).toBeUndefined()
    expect(params.dir).toBeUndefined()
  })

  it('lets a clicked column header override the view sort', () => {
    const params = viewQueryParams(definition({ sort: { field: 'area', direction: 'DESC' } }), {
      ...query,
      sort: 'codigo',
      descending: false
    })
    expect(params.sort).toBe('codigo')
    expect(params.dir).toBe('asc')
  })

  it('sends the page size the view declares', () => {
    const params = viewQueryParams(definition({ pageSize: 50 }), { ...query, page: 2 })
    expect(params.size).toBe('50')
    expect(params.page).toBe('2')
  })

  it('passes the search text through', () => {
    const params = viewQueryParams(definition(), { ...query, search: 'esperanza' })
    expect(params.q).toBe('esperanza')
  })

  it('does not let a filter clobber a reserved param', () => {
    const params = viewQueryParams(definition({ filters: { size: '9999' }, pageSize: 25 }), query)
    expect(params.size).toBe('25')
  })
})

describe('effectiveSort', () => {
  it('reports the view sort when the session has none', () => {
    const sort = effectiveSort(definition({ sort: { field: 'area', direction: 'DESC' } }), query)
    expect(sort).toEqual({ field: 'area', descending: true })
  })

  it('reports the session sort when there is one', () => {
    const sort = effectiveSort(definition({ sort: { field: 'area', direction: 'DESC' } }), {
      ...query,
      sort: 'codigo'
    })
    expect(sort).toEqual({ field: 'codigo', descending: false })
  })
})

describe('fallbackView', () => {
  it('shows the visible fields when no view is stored', () => {
    const view = fallbackView('predio', [...fields, field('oculto', false)])
    expect(view.definition.columns).toEqual(['codigo', 'area', 'nombre'])
    expect(view.generated).toBe(true)
    expect(view.definition.pageSize).toBe(25)
  })
})

describe('pickView', () => {
  const view = (name: string, isDefault: boolean): View => ({
    id: name,
    name,
    label: name,
    objectName: 'predio',
    isDefault,
    generated: false,
    definition: definition()
  })

  it('prefers the named view', () => {
    expect(pickView([view('a', true), view('b', false)], 'b')?.name).toBe('b')
  })

  it('falls back to the default when the name is unknown', () => {
    expect(pickView([view('a', false), view('b', true)], 'ghost')?.name).toBe('b')
  })

  it('returns null when there is nothing to pick', () => {
    expect(pickView([], 'a')).toBeNull()
  })
})
