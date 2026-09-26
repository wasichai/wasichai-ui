import { useRegistry, type FieldMeta, type ObjectDefinition, type PageComponent, type RelatedSide } from '@wasichai/core'
import { cn } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { isCoreType, useTypeLabel } from '../registrySlots'

export interface ComponentMockProps {
  component: PageComponent
  definition: ObjectDefinition
  sides: RelatedSide[]
}

// draws what a leaf WOULD show, from metadata the builder already has in hand. it sits inside a
// draggable canvas node, so nothing here fetches, mounts a map, or takes a click — a real control
// would eat the drag. containers (TABS/TAB/SECTION) are drawn by the canvas itself, not here.
export function ComponentMock({ component, definition, sides }: ComponentMockProps) {
  switch (component.type) {
    case 'FIELD':
      return <FieldMock component={component} definition={definition} />
    case 'FORM':
      return <FormMock component={component} definition={definition} />
    case 'RELATED_LIST':
      return <RelatedListMock component={component} sides={sides} />
    case 'HISTORY':
      return <HistoryMock />
    case 'TEXT':
      return <TextMock component={component} />
    case 'ACTION':
      return <ActionMock component={component} />
    default:
      return <ModuleMock component={component} definition={definition} />
  }
}

// a module's component draws its own mock. one with none, or whose module is not installed, gets a
// labelled box: the admin still sees it sits there, and can move or delete it
function ModuleMock({ component, definition }: { component: PageComponent; definition: ObjectDefinition }) {
  const { pageComponents } = useRegistry()
  const typeLabel = useTypeLabel()
  if (isCoreType(component.type)) return null
  const Preview = pageComponents[component.type]?.preview
  if (Preview) return <Preview component={component} definition={definition} />
  return (
    <div className="flex h-16 items-center justify-center rounded border border-dashed border-border bg-surface-muted text-center text-xs text-ink-muted">
      {typeLabel(component.type)}
    </div>
  )
}

function FormMock({ component, definition }: { component: PageComponent; definition: ObjectDefinition }) {
  const byName = new Map(definition.fields.map((candidate) => [candidate.name, candidate]))
  // named fields, in the order the admin picked them; no list at all means the whole object
  const shown = component.fields
    ? component.fields.map((name) => byName.get(name)).filter((field): field is FieldMeta => field !== undefined)
    : definition.fields

  return (
    <div className="space-y-3">
      {component.form ? <p className="text-xs font-medium text-ink-muted">{component.form}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        {shown.map((field) => (
          <div key={field.name} className="space-y-1">
            <span className="block text-xs text-ink-muted">{field.label}</span>
            <div className="h-8 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

function RelatedListMock({ component, sides }: { component: PageComponent; sides: RelatedSide[] }) {
  const side = sides.find((candidate) => candidate.relationship === component.relationship)

  return (
    <div className="space-y-2">
      {/* relationship gone or renamed: say so instead of pretending a label exists */}
      {side ? <p className="text-xs font-medium text-ink-muted">{side.label}</p> : <p className="text-xs font-medium text-danger">{component.relationship}</p>}
      <div className="space-y-1.5">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-6 rounded bg-surface-muted" />
        ))}
      </div>
    </div>
  )
}

function HistoryMock() {
  return (
    <div className="space-y-3 border-l border-border pl-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-border" />
          <div className="h-4 w-3/4 rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  )
}

function TextMock({ component }: { component: PageComponent }) {
  const { t } = useTranslation(['pages', 'common'])
  return <p className="whitespace-pre-line text-sm text-ink-muted">{component.content || t('pages.mockText.placeholder')}</p>
}

function ActionMock({ component }: { component: PageComponent }) {
  const { t } = useTranslation(['pages', 'common'])
  const label = component.title ?? component.transition ?? component.target ?? t('pages.action')

  return (
    // a button SHAPE, never a real one: this renders inside a draggable node and a real control
    // would swallow the drag.
    <div
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium',
        component.style === 'PRIMARY' ? 'bg-brand text-on-brand' : 'border border-border bg-surface text-ink'
      )}
    >
      {label}
    </div>
  )
}

// one placed field: its label and a box where the control will be. a real control would eat the drag.
function FieldMock({ component, definition }: { component: PageComponent; definition: ObjectDefinition }) {
  const meta = definition.fields.find((candidate) => candidate.name === component.field)
  const dimmed = component.visible === false
  return (
    <div className={cn('space-y-1', dimmed && 'opacity-50')}>
      <span className="block text-xs text-ink-muted">{meta?.label ?? component.field}</span>
      <div className="h-8 rounded bg-surface-muted" />
    </div>
  )
}
