import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardBody, CardHeader, CardTitle, cn, Tabs } from '@wasichai/ui'
import { useRegistry } from '../../app/context'
import { RecordHistory } from '../../features/history/RecordHistory'
import { useObjectRelationships, useStoredForm } from '../../queries'
import {
  CORE_FIELD_TYPES,
  CORE_PAGE_COMPONENT_TYPES,
  type FieldMeta,
  type ObjectDefinition,
  type Page,
  type PageComponent,
  type PageLayout,
  type RecordItem,
  type RecordPayload
} from '../../types/metadata'
import { DynamicForm } from '../dynamic-form/DynamicForm'
import { RelatedList } from '../related/RelatedList'
import { ActionButton } from './ActionButton'
import { ROW_CLASS, regionStyle } from './layout'

type SubmitHandler = (payload: RecordPayload) => void

const CORE_TYPES: readonly string[] = CORE_PAGE_COMPONENT_TYPES
// a form that does not save must never offer a widget whose value it would drop: a module field
// leaves regardless of whether some module claims it, and so does a leftover type nothing claims.
const CORE_FIELD_TYPE_SET = new Set<string>(CORE_FIELD_TYPES)

export interface PageRendererProps {
  page: Page
  definition: ObjectDefinition
  record: RecordItem
  onSubmit: SubmitHandler
  submitting?: boolean
  error?: string | null
}

// the detail page an admin configured, drawn for one record. no component is hardcoded here:
// what shows up and where comes from the page definition tree, and module types from the registry.
export function PageRenderer({ page, definition, record, onSubmit, submitting, error }: PageRendererProps) {
  const { t } = useTranslation()
  const { pageActions, pageComponents } = useRegistry()
  const relationships = useObjectRelationships(definition.name)
  const known = (relationships.data ?? []).map((side) => side.relationship)
  // one record, one save button: the first form in document order owns submission, the rest are
  // read-along field groups whose submit does nothing.
  const owner = firstForm(page.definition.page)
  // a leaf draws when core or some module knows its type
  const drawable = (type: string) => CORE_TYPES.includes(type) || Object.hasOwn(pageComponents, type)
  // an ACTION leaf draws only when its own kind resolves: NAVIGATE is core's, any other kind needs
  // a module that claimed it. an ACTION whose kind nothing knows must not keep a tab open.
  const actionDraws = (node: PageComponent) => node.action === 'NAVIGATE' || (node.action != null && Object.hasOwn(pageActions, node.action))

  const inColumns = (nodes: PageComponent[], layout: PageLayout) => {
    const count = layout === 'two-column' ? 2 : 1
    const columns: PageComponent[][] = Array.from({ length: count }, () => [])
    nodes.forEach((child) => {
      // a component aimed at a column this container does not have would vanish. put it first.
      const column = Number.isInteger(child.column) && child.column >= 1 && child.column <= count ? child.column : 1
      columns[column - 1].push(child)
    })
    return columns
  }

  const body = (nodes: PageComponent[], layout: PageLayout, padded: boolean) => (
    <div className={cn(layout === 'two-column' ? 'grid gap-5 lg:grid-cols-2 lg:items-start' : 'space-y-5', padded && 'p-8')}>
      {inColumns(nodes, layout).map((column, position) => (
        <div key={position} className="space-y-5" data-testid={`page-column-${position + 1}`}>
          {column.map((child, index) => renderComponent(child, index))}
        </div>
      ))}
    </div>
  )

  const renderComponent = (component: PageComponent, index: number): ReactNode => {
    const key = `${component.type}-${index}`

    switch (component.type) {
      case 'PAGE': {
        // the template says how the regions sit; the tree says what is in them.
        return (
          <div key={key} className="space-y-3 p-8">
            {page.template.rows.map((row, position) => (
              <div key={position} className={ROW_CLASS}>
                {row.regions.map((slot) => {
                  const child = component.children.find((candidate) => candidate.region === slot.name)
                  // the server validates that the tree matches its template. a mismatch is a bug,
                  // and healing it here would hide one.
                  if (!child) return null
                  return (
                    <div key={slot.name} data-region={slot.name} style={regionStyle(slot.span)} className="min-w-0">
                      {renderComponent(child, -1)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )
      }

      case 'REGION':
        return (
          <div key={key} className="space-y-5">
            {body(component.children, component.layout, false)}
          </div>
        )

      case 'TABS': {
        const open = component.children.filter((child) => draws(child, known, drawable, actionDraws))
        if (open.length === 0) return null
        return (
          <Tabs
            key={key}
            label={t('pages.tabs.label')}
            tabs={open.map((child, position) => ({
              id: `${child.title ?? 'tab'}-${position}`,
              // a generated page names its tabs with keys, because the server has no language.
              // anything an admin typed is printed as they typed it.
              label: child.title ? t(`pages.tabs.${child.title}`, { defaultValue: child.title }) : t('pages.tabs.page'),
              render: () => body(child.children, child.layout, true)
            }))}
          />
        )
      }

      // a tab outside a strip cannot happen: the server refuses it
      case 'TAB':
        return null

      case 'SECTION':
        return (
          <Card key={key}>
            {component.title ? (
              <CardHeader>
                <CardTitle>{component.title}</CardTitle>
              </CardHeader>
            ) : null}
            <CardBody>{body(component.children, component.layout, false)}</CardBody>
          </Card>
        )

      case 'ACTION':
        return <ActionButton key={key} component={component} objectName={definition.name} recordId={record.id} />

      case 'DYNAMIC_FORM': {
        const isOwner = component === owner
        return (
          <Card key={key}>
            {component.title ? (
              <CardHeader>
                <CardTitle>{component.title}</CardTitle>
              </CardHeader>
            ) : null}
            <CardBody>
              <DynamicForm
                definition={{ ...definition, fields: placedFields(component, definition) }}
                record={record}
                submitting={isOwner ? submitting : false}
                error={isOwner ? error : null}
                onSubmit={isOwner ? onSubmit : noop}
                readOnly={!isOwner}
              />
            </CardBody>
          </Card>
        )
      }

      case 'FORM': {
        const isOwner = component === owner
        return (
          <Card key={key}>
            {component.title ? (
              <CardHeader>
                <CardTitle>{component.title}</CardTitle>
              </CardHeader>
            ) : null}
            <CardBody>
              {component.form ? (
                // a named form owns its own layout; `fields` is ignored when one is named
                <StoredFormComponent
                  formName={component.form}
                  definition={definition}
                  record={record}
                  owner={isOwner}
                  submitting={submitting}
                  error={error}
                  onSubmit={onSubmit}
                />
              ) : (
                <DynamicForm
                  definition={narrowDefinition(definition, component.fields, isOwner)}
                  record={record}
                  submitting={isOwner ? submitting : false}
                  error={isOwner ? error : null}
                  onSubmit={isOwner ? onSubmit : noop}
                  readOnly={!isOwner}
                />
              )}
            </CardBody>
          </Card>
        )
      }

      case 'RELATED_LIST': {
        const side = (relationships.data ?? []).find((candidate) => candidate.relationship === component.relationship)
        // relationship gone or renamed: skip it rather than blow up the whole page
        if (!side) return null
        return <RelatedList key={key} objectName={definition.name} recordId={record.id} side={side} />
      }

      case 'HISTORY':
        return <RecordHistory key={key} objectName={definition.name} recordId={record.id} definition={definition} />

      case 'TEXT':
        return (
          <Card key={key}>
            {component.title ? (
              <CardHeader>
                <CardTitle>{component.title}</CardTitle>
              </CardHeader>
            ) : null}
            <CardBody>
              <p className="whitespace-pre-line text-sm text-ink-muted">{component.content ?? ''}</p>
            </CardBody>
          </Card>
        )

      default: {
        // module type (a module was uninstalled leaves an unknown type): the module that
        // registered it draws it through its `render`. none did: a quiet placeholder, never a crash.
        const moduleComponent = pageComponents[component.type]
        if (!moduleComponent)
          return (
            <p key={key} className="text-sm text-ink-muted">
              {t('pages.componentUnavailable')}
            </p>
          )
        const ModuleComponent = moduleComponent.render
        return <ModuleComponent key={key} component={component} definition={definition} record={record} />
      }
    }
  }

  // the root is always a PAGE node now: one region per row slot, laid out by its template.
  return renderComponent(page.definition.page, 0)
}

function noop() {}

// its own component so the fetch only happens for a component that names a form
function StoredFormComponent({
  formName,
  definition,
  record,
  owner,
  submitting,
  error,
  onSubmit
}: {
  formName: string
  definition: ObjectDefinition
  record: RecordItem
  owner: boolean
  submitting?: boolean
  error?: string | null
  onSubmit: SubmitHandler
}) {
  const { t } = useTranslation()
  const form = useStoredForm(definition.name, formName)

  if (form.isLoading) return <p className="text-sm text-ink-muted">{t('common.loading')}</p>

  return (
    <DynamicForm
      // a form that does not save keeps only core-typed fields: a module or leftover type never
      // gets an editable widget whose value this form would drop on submit
      definition={owner ? definition : { ...definition, fields: definition.fields.filter((field) => CORE_FIELD_TYPE_SET.has(field.type)) }}
      form={form.data}
      record={record}
      submitting={owner ? submitting : false}
      error={owner ? error : null}
      onSubmit={owner ? onSubmit : noop}
      readOnly={!owner}
    />
  )
}

// a dynamic form's fields are its children, each carrying what this placement shows of it. an
// invisible one is dropped outright; editable can only take away what the object already granted.
function placedFields(component: PageComponent, definition: ObjectDefinition): FieldMeta[] {
  const byName = new Map(definition.fields.map((field) => [field.name, field]))
  return component.children
    .map((child) => {
      const meta = byName.get(child.field ?? '')
      if (!meta || child.visible === false) return null
      return child.editable === false ? { ...meta, editable: false } : meta
    })
    .filter((field): field is FieldMeta => field !== null)
}

// `fields` picks a subset in the author's order. a module field is picked the same way, except in
// the form that does not save, which keeps only core types: a claimed module type and an unclaimed
// leftover type both leave, since neither one's value would travel with this form's submit.
function narrowDefinition(definition: ObjectDefinition, fields: string[] | null, keepModuleFields: boolean): ObjectDefinition {
  const byName = new Map(definition.fields.map((field) => [field.name, field]))
  const picked = fields ? fields.map((name) => byName.get(name)).filter((field): field is FieldMeta => field !== undefined) : definition.fields
  return {
    ...definition,
    fields: keepModuleFields ? picked : picked.filter((field) => CORE_FIELD_TYPE_SET.has(field.type))
  }
}

// pre-order: the first form you would read going down the page, starting from the root. both form
// types count -- a page whose only form is dynamic would otherwise have no owner, and every form on
// it would render read-only with no save button anywhere.
function firstForm(node: PageComponent): PageComponent | null {
  if (node.type === 'FORM' || node.type === 'DYNAMIC_FORM') return node
  for (const child of node.children) {
    const found = firstForm(child)
    if (found) return found
  }
  return null
}

// a tab whose every component draws nothing is a button that opens an empty panel
function draws(node: PageComponent, relationships: string[], drawable: (type: string) => boolean, actionDraws: (node: PageComponent) => boolean): boolean {
  if (node.type === 'RELATED_LIST') return relationships.includes(node.relationship ?? '')
  // an ACTION is a leaf, but its own drawable-ness is about its action kind, not its component type
  if (node.type === 'ACTION') return actionDraws(node)
  if (node.children.length > 0) return node.children.some((child) => draws(child, relationships, drawable, actionDraws))
  return !(node.type === 'TABS' || node.type === 'TAB' || node.type === 'SECTION' || node.type === 'DYNAMIC_FORM') && drawable(node.type)
}
