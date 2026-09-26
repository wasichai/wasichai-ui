import type { WasichaiModule } from '@wasichai/core'
import { FileText } from 'lucide-react'
import { formsMessages } from './i18n'

export const FORMS_MODULE_ID = 'forms'

export interface FormsModuleOptions {
  // url prefix of every route of the module. default keeps the original app's /builder/forms
  basePath?: string
}

export function formsModule(options: FormsModuleOptions = {}): WasichaiModule {
  return {
    id: FORMS_MODULE_ID,
    basePath: options.basePath ?? 'builder',
    routes: [{ id: 'builder', path: 'forms', lazy: () => import('./FormBuilderPage').then((m) => ({ default: m.FormBuilderPage })) }],
    // the builder group is core's; pages 10, forms 20, documents 30, views 40 as in the original app's sidebar
    nav: [{ group: 'builder', labelKey: 'forms:nav.forms', order: 20, icon: FileText, route: 'builder' }],
    i18n: formsMessages
  }
}
