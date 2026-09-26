import type { PageComponentProps } from '@wasichai/core'
import { WorkflowPanel } from '../WorkflowPanel'

// a WORKFLOW node on a record page: the panel of that record, of that object
export function WorkflowComponent({ definition, record }: PageComponentProps) {
  return <WorkflowPanel objectName={definition.name} recordId={record.id} />
}
