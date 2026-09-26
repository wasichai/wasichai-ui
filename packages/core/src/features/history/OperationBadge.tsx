import { useTranslation } from 'react-i18next'
import { Badge } from '@wasichai/ui'
import { cn } from '@wasichai/ui'
import { useRegistry } from '../../app/context'
import type { HistoryTone } from '../../registry/contract'
import type { AuditOperation } from '../../types/audit'

// core's own three keep their built-in colours, unconditionally: a module cannot restyle them.
const CORE_TONES: Record<'CREATE' | 'UPDATE' | 'DELETE', string> = {
  CREATE: 'bg-success/15 text-success',
  UPDATE: 'bg-brand-soft text-brand-strong',
  DELETE: 'bg-danger/15 text-danger'
}

// same look as UPDATE's badge, so 'neutral' reads as "nothing special happened" here too
const TONES: Record<HistoryTone, string> = {
  neutral: 'bg-brand-soft text-brand-strong',
  success: 'bg-success/15 text-success',
  warning: 'bg-amber-500/15 text-amber-700',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-brand/15 text-brand-strong'
}

function isCoreOperation(operation: AuditOperation): operation is 'CREATE' | 'UPDATE' | 'DELETE' {
  return operation === 'CREATE' || operation === 'UPDATE' || operation === 'DELETE'
}

export function OperationBadge({ operation }: { operation: AuditOperation }) {
  const { t } = useTranslation()
  const { historyRenderers } = useRegistry()

  if (isCoreOperation(operation)) return <Badge className={cn(CORE_TONES[operation])}>{t(`history.operations.${operation}`)}</Badge>

  const renderer = historyRenderers[operation]
  // no module claimed this operation: a neutral badge with the raw name beats hiding it
  if (!renderer) return <Badge className={cn(TONES.neutral)}>{operation}</Badge>
  return <Badge className={cn(TONES[renderer.tone ?? 'neutral'])}>{t(renderer.labelKey)}</Badge>
}
