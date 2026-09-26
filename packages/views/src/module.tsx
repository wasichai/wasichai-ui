import type { WasichaiModule } from '@wasichai/core'
import { Columns3 } from 'lucide-react'
import { viewsMessages } from './i18n'

export const VIEWS_MODULE_ID = 'views'

export interface ViewsModuleOptions {
  // url prefix of every route of the module. default keeps the original app's /builder/views
  basePath?: string
}

export function viewsModule(options: ViewsModuleOptions = {}): WasichaiModule {
  return {
    id: VIEWS_MODULE_ID,
    basePath: options.basePath ?? 'builder',
    routes: [{ id: 'builder', path: 'views', lazy: () => import('./ViewBuilderPage').then((m) => ({ default: m.ViewBuilderPage })) }],
    // the builder group is core's; pages 10, forms 20, documents 30, views 40 as in the original app's sidebar
    nav: [{ group: 'builder', labelKey: 'views:nav.views', order: 40, icon: Columns3, route: 'builder' }],
    i18n: viewsMessages
  }
}
