import { Workflow } from 'lucide-react'
import type { WasichaiModule } from '@wasichai/core'
import { workflowMessages } from './i18n'
import { TransitionAction } from './slots/TransitionAction'
import { TransitionSettings } from './slots/TransitionSettings'
import { WorkflowComponent } from './slots/WorkflowComponent'
import { WorkflowPreview } from './slots/WorkflowPreview'
import { useWorkflowFlags } from './slots/useWorkflowFlags'

export const WORKFLOW_MODULE_ID = 'workflow'

export interface WorkflowModuleOptions {
  // url prefix of every route of the module. default keeps the original app's urls
  basePath?: string
}

export function workflowModule(options: WorkflowModuleOptions = {}): WasichaiModule {
  return {
    id: WORKFLOW_MODULE_ID,
    basePath: options.basePath ?? 'automation',
    // lazy: xyflow only loads when someone opens the builder
    routes: [{ id: 'builder', path: 'workflows', lazy: () => import('./WorkflowBuilderPage').then((m) => ({ default: m.WorkflowBuilderPage })) }],
    nav: [{ group: 'automation', labelKey: 'workflow:nav.workflows', order: 10, icon: Workflow, route: 'builder' }],
    pageComponents: {
      WORKFLOW: { render: WorkflowComponent, labelKey: 'workflow:pageComponents.WORKFLOW', icon: Workflow, preview: WorkflowPreview }
    },
    pageActions: {
      TRANSITION: { render: TransitionAction, labelKey: 'workflow:pageActions.TRANSITION', settings: TransitionSettings, defaults: { action: 'TRANSITION' } }
    },
    objectFlags: useWorkflowFlags,
    i18n: workflowMessages
  }
}
