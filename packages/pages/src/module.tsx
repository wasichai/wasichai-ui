import { LayoutTemplate } from 'lucide-react'
import type { WasichaiModule } from '@wasichai/core'
import { pagesMessages } from './i18n'

export const PAGES_MODULE_ID = 'pages'

export interface PagesModuleOptions {
  // url prefix of every route of the module. default keeps the original app's urls (/builder/pages)
  basePath?: string
}

// the page builder. module components and actions (gis MAP, workflow WORKFLOW/TRANSITION) reach
// it only through the registry, so it works with any set of modules installed, or none
export function pagesModule(options: PagesModuleOptions = {}): WasichaiModule {
  return {
    id: PAGES_MODULE_ID,
    basePath: options.basePath ?? 'builder',
    routes: [{ id: 'builder', path: 'pages', lazy: () => import('./PageBuilderPage').then((module) => ({ default: module.PageBuilderPage })) }],
    nav: [{ group: 'builder', labelKey: 'pages:nav.pages', order: 10, icon: LayoutTemplate, route: 'builder' }],
    i18n: pagesMessages
  }
}
