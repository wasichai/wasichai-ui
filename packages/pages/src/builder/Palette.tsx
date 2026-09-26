import { useDraggable } from '@dnd-kit/core'
import { useRegistry, type FieldMeta, type ObjectDefinition, type PageComponentType } from '@wasichai/core'
import { cn, Tabs } from '@wasichai/ui'
import {
  ClipboardList,
  FormInput,
  History as HistoryIcon,
  LayoutPanelTop,
  List,
  MousePointerClick,
  Puzzle,
  Rows3,
  SquareStack,
  Type as TypeIcon
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { useTypeLabel } from './registrySlots'

type Icon = ComponentType<{ className?: string }>

// what an admin may drag from the components tab. PAGE and REGION come from the template, and a
// FIELD comes from the fields tab, named after a real field -- none of the three is a type you pick.
const CONTAINERS: PageComponentType[] = ['TABS', 'TAB', 'SECTION']
// core's own content. module types (gis: MAP, workflow: WORKFLOW) follow, in registration order
const CONTENT: PageComponentType[] = ['FORM', 'DYNAMIC_FORM', 'RELATED_LIST', 'HISTORY', 'TEXT']
const ACTIONS: PageComponentType[] = ['ACTION']

const ICONS: Record<string, Icon> = {
  TABS: LayoutPanelTop,
  TAB: SquareStack,
  SECTION: Rows3,
  FORM: ClipboardList,
  DYNAMIC_FORM: FormInput,
  RELATED_LIST: List,
  HISTORY: HistoryIcon,
  TEXT: TypeIcon,
  ACTION: MousePointerClick
}

export interface PaletteProps {
  definition: ObjectDefinition
}

// two tabs: the component types the canvas can draw, and the object's own fields. a field is not a
// type -- it is one named column of this object -- so it gets a tab rather than a group.
export function Palette({ definition }: PaletteProps) {
  const { t } = useTranslation(['pages', 'common'])
  return (
    <div className="p-4">
      <Tabs
        label={t('pages.palette')}
        tabs={[
          { id: 'components', label: t('pages.palette'), render: () => <Components /> },
          { id: 'fields', label: t('pages.paletteFields'), render: () => <Fields fields={definition.fields} /> }
        ]}
      />
    </div>
  )
}

function Components() {
  const { t } = useTranslation(['pages', 'common'])
  const { pageComponents } = useRegistry()
  return (
    <div className="space-y-5 pt-4">
      <PaletteGroup label={t('pages.paletteContainers')} types={CONTAINERS} />
      <PaletteGroup label={t('pages.paletteContent')} types={[...CONTENT, ...Object.keys(pageComponents)]} />
      <PaletteGroup label={t('pages.paletteActions')} types={ACTIONS} />
    </div>
  )
}

// every field the object has, whatever its type: a form may place one wherever the admin wants it
function Fields({ fields }: { fields: FieldMeta[] }) {
  const { t } = useTranslation(['pages', 'common'])
  if (fields.length === 0) {
    return <p className="pt-4 text-xs text-ink-muted">{t('pages.paletteNoFields')}</p>
  }
  return (
    <div className="flex flex-col gap-2 pt-4">
      {fields.map((field) => (
        <FieldItem key={field.name} field={field} />
      ))}
    </div>
  )
}

function PaletteGroup({ label, types }: { label: string; types: PageComponentType[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase text-ink-muted">{label}</p>
      <div className="flex flex-col gap-2">
        {types.map((type) => (
          <PaletteItem key={type} type={type} />
        ))}
      </div>
    </div>
  )
}

const ITEM_CLASS =
  'flex w-full cursor-grab items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-left text-xs font-medium text-ink hover:bg-surface-muted'

function PaletteItem({ type }: { type: PageComponentType }) {
  const { pageComponents } = useRegistry()
  const typeLabel = useTypeLabel()
  const Icon = pageComponents[type]?.icon ?? ICONS[type] ?? Puzzle
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'palette:' + type })

  return (
    <button ref={setNodeRef} type="button" {...listeners} {...attributes} className={cn(ITEM_CLASS, isDragging && 'opacity-50')}>
      <Icon className="h-3.5 w-3.5 text-ink-muted" />
      {typeLabel(type)}
    </button>
  )
}

// a button like the others, not a div: a sweep in the builder tests counts div draggables, and the
// component items have always been buttons anyway.
function FieldItem({ field }: { field: FieldMeta }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'field:' + field.name })

  return (
    <button ref={setNodeRef} type="button" {...listeners} {...attributes} className={cn(ITEM_CLASS, isDragging && 'opacity-50')}>
      <FormInput className="h-3.5 w-3.5 text-ink-muted" />
      <span className="truncate">{field.label}</span>
    </button>
  )
}
