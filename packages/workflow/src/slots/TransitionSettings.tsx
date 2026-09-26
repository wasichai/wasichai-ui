import { useTranslation } from 'react-i18next'
import type { PageComponentSettingsProps } from '@wasichai/core'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { useWorkflow } from '../api'

// which transition a TRANSITION button fires. the page builder draws it under the kind picker.
export function TransitionSettings({ component, objectName, onChange }: PageComponentSettingsProps) {
  const { t } = useTranslation(['workflow', 'common'])
  const workflow = useWorkflow(objectName || undefined)
  // a disabled workflow accepts no transition at all; offering one the server would refuse helps no one
  const transitions = workflow.data?.enabled ? workflow.data.definition.transitions.map((transition) => transition.name) : []

  return (
    <div className="space-y-1.5">
      <Label>{t('pages.transition')}</Label>
      <Select value={component.transition ?? ''} onValueChange={(value) => onChange({ transition: value })}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {transitions.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
