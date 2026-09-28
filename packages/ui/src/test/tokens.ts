// the tokens every theme sets, for the theme tests: the base ones (ADR-034) and the extension ones (ADR-035)
export const BASE = [
  'surface',
  'surface-muted',
  'border',
  'ink',
  'ink-muted',
  'brand',
  'brand-strong',
  'brand-soft',
  'on-brand',
  'shell',
  'shell-muted',
  'shell-ink',
  'danger',
  'on-danger',
  'success',
  'warning',
  'warning-soft',
  'overlay'
]

export const EXTENSION = ['success-soft', 'danger-soft', 'notice', 'notice-soft', 'link', 'focus', 'table-head', 'table-stripe', 'line', 'map-selected']

// the custom properties a declaration block sets, sorted
export const customProperties = (declarations: Map<string, string>) => [...declarations.keys()].filter((name) => name.startsWith('--')).sort()
