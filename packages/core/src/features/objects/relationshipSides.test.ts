import { describe, expect, it } from 'vitest'
import type { Relationship } from '../../types/metadata'
import { relationshipOfField, sidesOf } from './relationshipSides'

function relationship(overrides: Partial<Relationship>): Relationship {
  return {
    id: overrides.name ?? 'r',
    name: 'titular',
    label: 'Titular',
    inverseLabel: 'Predios',
    type: 'MANY_TO_ONE',
    source: 'predio',
    target: 'contribuyente',
    fieldName: 'titular',
    joinTable: null,
    ...overrides
  }
}

const all: Relationship[] = [
  relationship({ id: 'r1', name: 'titular' }),
  // predio is the target here, so the column lives on edificio
  relationship({ id: 'r2', name: 'edificios', type: 'ONE_TO_MANY', source: 'predio', target: 'edificio', fieldName: 'predio' }),
  relationship({ id: 'r3', name: 'ajena', source: 'via', target: 'distrito', fieldName: 'distrito' })
]

describe('sidesOf', () => {
  it('takes both directions and leaves out the ones this object has nothing to do with', () => {
    expect(sidesOf(all, 'predio').map((side) => side.relationship.name)).toEqual(['titular', 'edificios'])
    expect(sidesOf(all, 'contribuyente').map((side) => side.relationship.name)).toEqual(['titular'])
    expect(sidesOf(all, 'distrito').map((side) => side.relationship.name)).toEqual(['ajena'])
  })

  it('says which end you are standing on', () => {
    expect(sidesOf(all, 'predio')[0].outgoing).toBe(true)
    expect(sidesOf(all, 'contribuyente')[0].outgoing).toBe(false)
  })

  it('names the object at the other end, whichever end that is', () => {
    expect(sidesOf(all, 'predio')[0].otherObject).toBe('contribuyente')
    expect(sidesOf(all, 'contribuyente')[0].otherObject).toBe('predio')
  })

  // which side carries the column is what the type means, and the fields table needs to know
  it('claims the column only where it actually is', () => {
    // MANY_TO_ONE puts it on the source
    expect(sidesOf(all, 'predio')[0].ownField).toBe('titular')
    expect(sidesOf(all, 'contribuyente')[0].ownField).toBeNull()
    // ONE_TO_MANY puts it on the target
    expect(sidesOf(all, 'predio')[1].ownField).toBeNull()
    expect(sidesOf(all, 'edificio')[0].ownField).toBe('predio')
  })

  it('has no column to claim on either side of a many-to-many', () => {
    const m2m = [relationship({ name: 'zonas', type: 'MANY_TO_MANY', fieldName: null, joinTable: 'rel_zonas__00000000' })]
    expect(sidesOf(m2m, 'predio')[0].ownField).toBeNull()
    expect(sidesOf(m2m, 'contribuyente')[0].ownField).toBeNull()
  })

  // listing it twice would offer two delete buttons for one thing
  it('shows a relationship of an object with itself once, from the source side', () => {
    const loop = [relationship({ name: 'padre', source: 'predio', target: 'predio', fieldName: 'padre' })]
    const sides = sidesOf(loop, 'predio')
    expect(sides).toHaveLength(1)
    expect(sides[0].outgoing).toBe(true)
    expect(sides[0].ownField).toBe('padre')
  })
})

describe('relationshipOfField', () => {
  it('finds the relationship that owns a column, so the delete button can stop lying', () => {
    expect(relationshipOfField(all, 'predio', 'titular')?.name).toBe('titular')
    expect(relationshipOfField(all, 'edificio', 'predio')?.name).toBe('edificios')
  })

  it('leaves a plain relation field alone', () => {
    // predio owns no column for 'edificios', and 'codigo' belongs to nobody
    expect(relationshipOfField(all, 'predio', 'predio')).toBeNull()
    expect(relationshipOfField(all, 'predio', 'codigo')).toBeNull()
  })
})
