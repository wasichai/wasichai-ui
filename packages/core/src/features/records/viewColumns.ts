import type { FieldMeta, View, ViewDefinition } from '../../types/metadata'

export interface ListQuery {
  page: number
  search: string
  // session sort: a clicked column header beats the view's own sort. empty means "use the view".
  sort: string
  descending: boolean
}

// fields come and go; a column naming a dead field is skipped, not a crash.
export function viewColumns(definition: ViewDefinition, fields: FieldMeta[]): string[] {
  const known = new Set(fields.map((field) => field.name))
  return definition.columns.filter((name) => known.has(name))
}

// the records endpoint takes sort/dir/q/page/size and any field name as an equality filter
export function viewQueryParams(definition: ViewDefinition, query: ListQuery): Record<string, string> {
  const params: Record<string, string> = {}

  for (const [field, value] of Object.entries(definition.filters)) {
    if (value !== '') params[field] = value
  }

  // reserved names win over a filter that happens to share one
  params.page = String(query.page)
  params.size = String(definition.pageSize)
  params.q = query.search

  if (query.sort) {
    params.sort = query.sort
    params.dir = query.descending ? 'desc' : 'asc'
  } else if (definition.sort) {
    params.sort = definition.sort.field
    params.dir = definition.sort.direction === 'DESC' ? 'desc' : 'asc'
  }

  return params
}

// what the table header highlights: the session sort, or the view's own
export function effectiveSort(definition: ViewDefinition, query: ListQuery): { field: string; descending: boolean } {
  if (query.sort) return { field: query.sort, descending: query.descending }
  if (definition.sort) {
    return { field: definition.sort.field, descending: definition.sort.direction === 'DESC' }
  }
  return { field: '', descending: false }
}

// the backend may not have a view yet (or may be down). the list still has to work.
export function fallbackView(objectName: string, fields: FieldMeta[]): View {
  return {
    id: '',
    name: 'default',
    label: '',
    objectName,
    isDefault: true,
    generated: true,
    definition: {
      columns: fields
        .filter((field) => field.visible)
        .slice(0, 8)
        .map((field) => field.name),
      filters: {},
      sort: null,
      pageSize: 25
    }
  }
}

// the one the user picked, else the default, else the first
export function pickView(views: View[], name: string): View | null {
  if (views.length === 0) return null
  return views.find((view) => view.name === name) ?? views.find((view) => view.isDefault) ?? views[0]
}
