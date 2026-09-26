import { ListChecks, Zap } from 'lucide-react'
import type { WasichaiModule } from '@wasichai/core'
import { automationMessages } from './i18n'

export const AUTOMATION_MODULE_ID = 'automation'

export interface AutomationModuleOptions {
  // url prefix of every route of the module. default keeps the original app's urls (/automation/rules)
  basePath?: string
}

// the rule builder and the run log. both routed lazily, but index.ts also exports them statically
// (they're light enough); the lazy route is what actually keeps them out of an app's first bundle
export function automationModule(options: AutomationModuleOptions = {}): WasichaiModule {
  return {
    id: AUTOMATION_MODULE_ID,
    basePath: options.basePath ?? 'automation',
    routes: [
      { id: 'rules', path: 'rules', lazy: () => import('./AutomationBuilderPage').then((m) => ({ default: m.AutomationBuilderPage })) },
      { id: 'runs', path: 'runs', lazy: () => import('./AutomationRunsPage').then((m) => ({ default: m.AutomationRunsPage })) }
    ],
    // the automation group is core's; workflow sits at 10 and the assistant at 40
    nav: [
      { group: 'automation', labelKey: 'automation:nav.rules', order: 20, icon: Zap, route: 'rules' },
      { group: 'automation', labelKey: 'automation:nav.runs', order: 30, icon: ListChecks, route: 'runs' }
    ],
    i18n: automationMessages
  }
}
