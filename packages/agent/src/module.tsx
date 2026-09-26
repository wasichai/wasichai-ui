import type { WasichaiModule } from '@wasichai/core'
import { Sparkles } from 'lucide-react'
import { agentMessages } from './i18n'

export const AGENT_MODULE_ID = 'agent'

export interface AgentModuleOptions {
  // url prefix of every route of the module. default keeps the original app's /automation/assistant
  basePath?: string
}

export function agentModule(options: AgentModuleOptions = {}): WasichaiModule {
  return {
    id: AGENT_MODULE_ID,
    basePath: options.basePath ?? 'automation',
    routes: [{ id: 'assistant', path: 'assistant', lazy: () => import('./AssistantPage').then((m) => ({ default: m.AssistantPage })) }],
    // the automation group is core's; workflows 10, rules 20, runs 30, assistant 40 as in the original app's sidebar
    nav: [{ group: 'automation', labelKey: 'agent:nav.assistant', order: 40, icon: Sparkles, route: 'assistant' }],
    i18n: agentMessages
  }
}
