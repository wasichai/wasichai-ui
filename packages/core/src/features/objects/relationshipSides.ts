import type { Relationship, RelationshipType } from '../../types/metadata'

export interface RelationshipSide {
  relationship: Relationship
  // this object is the source: the label reads forward from here
  outgoing: boolean
  otherObject: string
  // the column on THIS object's table, when the relationship put one here
  ownField: string | null
}

// the foreign key lives with the source for these, with the target for ONE_TO_MANY, and nowhere
// for MANY_TO_MANY, which gets a join table instead. mirrors RelationshipType in the backend.
function fkOnSource(type: RelationshipType): boolean {
  return type === 'MANY_TO_ONE' || type === 'ONE_TO_ONE'
}

// both directions in one pass. a relationship of an object with itself shows up once, outgoing,
// because listing it twice would offer two delete buttons for one thing.
export function sidesOf(relationships: Relationship[], objectName: string): RelationshipSide[] {
  return relationships
    .filter((item) => item.source === objectName || item.target === objectName)
    .map((relationship) => {
      const outgoing = relationship.source === objectName
      const ownsField = relationship.fieldName !== null && (outgoing ? fkOnSource(relationship.type) : !fkOnSource(relationship.type))
      return {
        relationship,
        outgoing,
        otherObject: outgoing ? relationship.target : relationship.source,
        ownField: ownsField ? relationship.fieldName : null
      }
    })
}

// which relationship owns this field, so the fields table can say so instead of offering a delete
// that answers 409.
export function relationshipOfField(relationships: Relationship[], objectName: string, fieldName: string): Relationship | null {
  return sidesOf(relationships, objectName).find((side) => side.ownField === fieldName)?.relationship ?? null
}
