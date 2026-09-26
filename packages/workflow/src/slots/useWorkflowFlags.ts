import { useWorkflow } from '../api'

// core's object editor asks whether an object has a workflow (its state column's scope). an object
// without one answers 404: no data, no flag. same query as the builder, so it is cached once.
export function useWorkflowFlags(objectName: string): Record<string, boolean> {
  const { data } = useWorkflow(objectName || undefined)
  return { workflow: Boolean(data) }
}
