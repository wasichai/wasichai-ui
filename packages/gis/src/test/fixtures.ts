import type { FieldMeta, ObjectDefinition, PageComponent, RecordItem } from '@wasichai/core'

export function field(name: string, label: string, extra: Partial<FieldMeta> = {}): FieldMeta {
  return {
    id: `f-${name}`,
    name,
    label,
    type: 'TEXT',
    required: false,
    unique: false,
    defaultValue: null,
    description: null,
    position: 0,
    enumOptions: null,
    relationTarget: null,
    visible: true,
    editable: true,
    ...extra
  }
}

export function geometryField(name: string, label: string, type = 'POLYGON'): FieldMeta {
  return field(name, label, { type: 'GEOMETRY', geometry: { type, srid: 32718, dimension: 2 } })
}

export const predio: ObjectDefinition = {
  id: 'o1',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  geometry: { type: 'POLYGON', srid: 32718, dimension: 2 },
  fields: [field('codigo', 'Código'), geometryField('lote', 'Lote'), geometryField('acceso', 'Acceso', 'POINT')]
}

export const flat: ObjectDefinition = {
  ...predio,
  id: 'o2',
  name: 'persona',
  label: 'Persona',
  pluralLabel: 'Personas',
  geometry: null,
  fields: [field('nombre', 'Nombre')]
}

export const polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0]
    ]
  ]
}
export const point = { type: 'Point', coordinates: [-77.04, -12.05] }

export function recordOf(geometries: Record<string, unknown>): RecordItem {
  return { id: 'r1', createdAt: null, updatedAt: null, attributes: { codigo: 'P-001' }, geometries }
}

export function node(type: string, extra: Partial<PageComponent> = {}): PageComponent {
  return { type, column: 1, title: null, layout: 'single-column', children: [], relationship: null, fields: null, content: null, ...extra }
}
