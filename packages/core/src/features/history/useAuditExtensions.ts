import { useMemo } from 'react'
import { useRegistry } from '../../app/context'
import type { AuditExtensions } from './changes'

// what the registered modules know about audit values and columns, in the shape changes.ts takes
export function useAuditExtensions(): AuditExtensions {
  const { auditValueFormatters, auditFieldLabels } = useRegistry()
  return useMemo(() => ({ valueFormatters: auditValueFormatters, fieldLabels: auditFieldLabels }), [auditValueFormatters, auditFieldLabels])
}
