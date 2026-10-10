import { useTranslation } from 'react-i18next'
import { Alert } from '@wasichai/ui'
import type { WritePolicy } from '../../lib/writePolicy'

export interface WritePolicyNoticeProps {
  policy: WritePolicy
  // a link speaks of both ends
  scope?: 'record' | 'link'
  className?: string
}

// says why a write is not offered, in place of the button the server would refuse
export function WritePolicyNotice({ policy, scope = 'record', className }: WritePolicyNoticeProps) {
  const { t } = useTranslation()
  // api-only refuses more than append-only: it names the stricter rule
  const rule = policy.apiOnly ? 'apiOnly' : policy.appendOnly ? 'appendOnly' : null
  if (!rule) return null
  return (
    <Alert tone="notice" className={className}>
      {t(`writePolicy.${scope}.${rule}`)}
    </Alert>
  )
}
