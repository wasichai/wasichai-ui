import { useRegistry, type ActionStyle, type Form, type ObjectDefinition, type PageLayout, type RelatedSide } from '@wasichai/core'
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@wasichai/ui'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Node } from './pageTree'
import { actionKinds, NAVIGATE, sanitizeModulePatch, useActionKindLabel, useTypeLabel } from './registrySlots'

const LAYOUTS: PageLayout[] = ['single-column', 'two-column']
const ACTION_STYLES: ActionStyle[] = ['PRIMARY', 'SECONDARY']
// radix select has no empty value, so "none of these" needs a sentinel of its own
const NO_FORM = '__none__'

export interface InspectorProps {
  node: Node | null
  // the layout of whatever holds the selected node: its parent container, or the page itself
  // at the root. column 2 only means something when that container actually has one.
  parentLayout: PageLayout
  definition: ObjectDefinition
  // module settings editors need it (workflow: which transitions the object's workflow offers)
  objectName: string
  sides: RelatedSide[]
  forms: Form[]
  objects: string[]
  onPatch: (uid: string, patch: Partial<Node>) => void
  onRemove: (uid: string) => void
}

// the selected node's own fields, and only the ones its type actually uses
export function Inspector({ node, parentLayout, definition, objectName, sides, forms, objects, onPatch, onRemove }: InspectorProps) {
  const { t } = useTranslation(['pages', 'common'])
  const { pageComponents } = useRegistry()
  const typeLabel = useTypeLabel()

  if (!node) {
    return <p className="p-4 text-sm text-ink-muted">{t('pages.nothingSelected')}</p>
  }

  const patch = (fragment: Partial<Node>) => onPatch(node.uid, fragment)
  // the server refuses column 2 unless the parent is two-column: never offer what it would refuse
  const columns = parentLayout === 'two-column' ? [1, 2] : [1]
  // a region is the template's, not the admin's. it has no bin (deleting it invalidates the page),
  // no title (its name comes from the template vocabulary) and no column of its own (the server
  // normalises it to 1). all it owns is how its own content splits.
  const scaffold = node.type === 'REGION'
  // a field placement has no title of its own -- its label comes from the object -- and no layout,
  // because it has no children to lay out. offering either is offering a control that does nothing.
  const placement = node.type === 'FIELD'
  // a module's own component (gis: MAP) brings its own settings. one whose module is not installed
  // keeps the built-in ones only, so the admin can still retitle, move or delete it
  const ModuleSettings = pageComponents[node.type]?.settings

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{typeLabel(node.type)}</h3>
        {scaffold ? null : (
          <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => onRemove(node.uid)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {scaffold || placement ? null : (
        <div className="space-y-1.5">
          <Label htmlFor="inspector-title">{t('pages.componentTitle')}</Label>
          <Input id="inspector-title" value={node.title ?? ''} onChange={(event) => patch({ title: event.target.value || null })} />
        </div>
      )}

      <div className={scaffold || placement ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
        {placement ? null : (
          <div className="space-y-1.5">
            <Label>{t('pages.layout')}</Label>
            <Select value={node.layout} onValueChange={(value) => patch({ layout: value as PageLayout })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUTS.map((layout) => (
                  <SelectItem key={layout} value={layout}>
                    {t(`pages.layouts.${layout}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {scaffold ? null : (
          <div className="space-y-1.5">
            <Label>{t('pages.column')}</Label>
            <Select value={String(node.column)} onValueChange={(value) => patch({ column: Number(value) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column} value={String(column)}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {node.type === 'FIELD' ? <FieldPlacement node={node} definition={definition} patch={patch} /> : null}

      {node.type === 'RELATED_LIST' ? (
        <div className="space-y-1.5">
          <Label>{t('pages.relationship')}</Label>
          <Select value={node.relationship ?? ''} onValueChange={(value) => patch({ relationship: value })}>
            <SelectTrigger>
              <SelectValue placeholder={t('relationships.pick')} />
            </SelectTrigger>
            <SelectContent>
              {sides.map((side) => (
                <SelectItem key={side.relationship} value={side.relationship}>
                  {side.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* the relationship the page names may no longer exist: say so instead of a blank select */}
          {node.relationship && !sides.some((side) => side.relationship === node.relationship) ? (
            <p className="text-xs text-danger">{t('pages.relationshipGone')}</p>
          ) : null}
        </div>
      ) : null}

      {node.type === 'FORM' ? (
        <>
          <div className="space-y-1.5">
            <Label>{t('pages.form')}</Label>
            <Select value={node.form ?? NO_FORM} onValueChange={(value) => patch(value === NO_FORM ? { form: null } : { form: value, fields: null })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FORM}>{t('pages.noForm')}</SelectItem>
                {forms.map((form) => (
                  <SelectItem key={form.id || form.name} value={form.name}>
                    {form.label || form.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-ink-muted">{t('pages.formHint')}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inspector-fields">{t('pages.fields')}</Label>
            <Input
              id="inspector-fields"
              value={(node.fields ?? []).join(', ')}
              disabled={Boolean(node.form)}
              onChange={(event) => patch({ fields: parseFields(event.target.value) })}
            />
            <p className="text-xs text-ink-muted">{t('pages.fieldsHint')}</p>
          </div>
        </>
      ) : null}

      {node.type === 'TEXT' ? (
        <div className="space-y-1.5">
          <Label htmlFor="inspector-content">{t('pages.content')}</Label>
          <Textarea id="inspector-content" value={node.content ?? ''} onChange={(event) => patch({ content: event.target.value || null })} />
        </div>
      ) : null}

      {node.type === 'ACTION' ? <ActionSettings node={node} definition={definition} objectName={objectName} objects={objects} patch={patch} /> : null}

      {ModuleSettings ? (
        <ModuleSettings
          component={node}
          definition={definition}
          objectName={objectName}
          onChange={(fragment) => patch(sanitizeModulePatch(fragment) as Partial<Node>)}
        />
      ) : null}
    </div>
  )
}

// what an ACTION does. NAVIGATE is core's and edited here; any other kind is a module's (workflow:
// TRANSITION) and brings its own settings editor.
function ActionSettings({
  node,
  definition,
  objectName,
  objects,
  patch
}: {
  node: Node
  definition: ObjectDefinition
  objectName: string
  objects: string[]
  patch: (fragment: Partial<Node>) => void
}) {
  const { t } = useTranslation(['pages', 'common'])
  const { pageActions } = useRegistry()
  const kindLabel = useActionKindLabel()
  const kinds = actionKinds(pageActions)
  const kind = node.action ?? kinds[0]
  // a stored kind whose module is gone stays on screen under its raw name instead of blanking the select
  const offered = kinds.includes(kind) ? kinds : [...kinds, kind]
  const KindSettings = pageActions[kind]?.settings

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('pages.actionKind')}</Label>
        {/* the kind last: a module's defaults never pick a kind other than the one clicked */}
        <Select value={kind} onValueChange={(value) => patch({ ...(pageActions[value]?.defaults ?? {}), action: value } as Partial<Node>)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {offered.map((option) => (
              <SelectItem key={option} value={option}>
                {kindLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {kind === NAVIGATE ? (
        <>
          <div className="space-y-1.5">
            <Label>{t('pages.targetObject')}</Label>
            <Select value={node.target ?? ''} onValueChange={(value) => patch({ target: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {objects.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inspector-url">{t('pages.url')}</Label>
            <Input id="inspector-url" value={node.url ?? ''} onChange={(event) => patch({ url: event.target.value || null })} />
          </div>
        </>
      ) : KindSettings ? (
        <KindSettings component={node} definition={definition} objectName={objectName} onChange={(fragment) => patch(fragment as Partial<Node>)} />
      ) : null}

      <div className="space-y-1.5">
        <Label>{t('pages.style')}</Label>
        <Select value={node.style ?? 'SECONDARY'} onValueChange={(value) => patch({ style: value as ActionStyle })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_STYLES.map((style) => (
              <SelectItem key={style} value={style}>
                {t(`pages.styles.${style}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// empty means "every field", which is null on the wire, not an empty list
function parseFields(value: string): string[] | null {
  const names = value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  return names.length > 0 ? names : null
}

// what a FIELD placement may say about its field. the name is not editable: it was chosen by
// dragging. the two toggles may take away what the object grants and never add to it, which is why
// editable is disabled outright on a read-only field -- the server refuses it, so never offer it.
function FieldPlacement({ node, definition, patch }: { node: Node; definition: ObjectDefinition; patch: (fragment: Partial<Node>) => void }) {
  const { t } = useTranslation(['pages', 'common'])
  const meta = definition.fields.find((candidate) => candidate.name === node.field)
  const CHECKBOX = 'h-4 w-4 accent-brand'

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t('pages.types.FIELD')}</Label>
        <p className="text-sm text-ink">{meta?.label ?? node.field}</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className={CHECKBOX}
          checked={node.visible ?? meta?.visible ?? true}
          onChange={(event) => patch({ visible: event.target.checked })}
        />
        {t('pages.fieldVisible')}
      </label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className={CHECKBOX}
          disabled={meta ? !meta.editable : false}
          checked={node.editable ?? meta?.editable ?? true}
          onChange={(event) => patch({ editable: event.target.checked })}
        />
        {t('pages.fieldEditable')}
      </label>
      {meta && !meta.editable ? <p className="text-xs text-ink-muted">{t('pages.fieldReadOnly')}</p> : null}
    </div>
  )
}
