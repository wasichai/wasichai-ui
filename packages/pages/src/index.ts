export { PAGES_MODULE_ID, pagesModule, type PagesModuleOptions } from './module'
export { pagesMessages } from './i18n'
// PageBuilderPage is deliberately NOT re-exported here: it (and everything it pulls in, down to
// @dnd-kit/core) reaches consumers only through pagesModule()'s lazy route. A static re-export from
// this entry would force dnd-kit into the same chunk as the entry itself, killing the lazy split.
