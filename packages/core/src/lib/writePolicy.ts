import { useObjectDefinition } from '../queries/objects'
import type { ObjectSummary } from '../types/metadata'

export type WriteRules = Pick<ObjectSummary, 'appendOnly' | 'apiOnly' | 'requiresReason'>

// what the generic ui may offer. the server refuses the rest anyway (409 append-only, 403 api-only)
export interface WritePolicy {
  // false while a definition is on its way: a write offered now could skip the reason prompt
  loaded: boolean
  appendOnly: boolean
  apiOnly: boolean
  requiresReason: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canLink: boolean
  canTransition: boolean
}

// a link passes both ends: a rule on either one holds
export function writePolicy(...objects: (WriteRules | null | undefined)[]): WritePolicy {
  const any = (rule: keyof WriteRules) => objects.some((object) => Boolean(object?.[rule]))
  const appendOnly = any('appendOnly')
  const apiOnly = any('apiOnly')
  return {
    loaded: objects.every((object) => object != null),
    appendOnly,
    apiOnly,
    requiresReason: any('requiresReason'),
    canCreate: !apiOnly,
    canUpdate: !apiOnly && !appendOnly,
    canDelete: !apiOnly && !appendOnly,
    canLink: !apiOnly && !appendOnly,
    // transitions are not a generic write: api-only objects still move through their workflow
    canTransition: !appendOnly
  }
}

// two fixed calls, so the hook order never changes; the second is off without a second end
export function useWritePolicy(objectName: string | undefined, otherObjectName?: string): WritePolicy {
  const first = useObjectDefinition(objectName)
  const second = useObjectDefinition(otherObjectName)
  // a failed read counts as no rules: the server still refuses, and the buttons are not held forever
  const settled = (query: { data?: unknown; isError: boolean }) => query.data !== undefined || query.isError
  return { ...writePolicy(first.data, second.data), loaded: settled(first) && (otherObjectName === undefined || settled(second)) }
}
