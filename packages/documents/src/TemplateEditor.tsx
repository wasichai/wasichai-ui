import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, Heading2 } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ObjectField, PlatformValueNode, PLATFORM_VALUES, RelatedTable } from './nodes'
import { Button } from '@wasichai/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { cn } from '@wasichai/ui'
import type { ObjectDefinition, RelatedSide } from '@wasichai/core'
import type { TemplateNode } from './types'

export interface TemplateEditorProps {
  value: TemplateNode
  onChange: (next: TemplateNode) => void
  definition: ObjectDefinition
  sides: RelatedSide[]
}

// the empty document, in prosemirror's own shape. an editor with no content at all refuses to
// place a cursor, so a template always starts as one empty paragraph.
export const EMPTY_TEMPLATE: TemplateNode = { type: 'doc', content: [{ type: 'paragraph' }] }

export function TemplateEditor({ value, onChange, definition, sides }: TemplateEditorProps) {
  const { t } = useTranslation(['documents', 'common'])
  const editor = useEditor({
    extensions: [StarterKit, ObjectField, PlatformValueNode, RelatedTable],
    // structurally the same tree; the cast bridges one convention, not one shape: the wire says
    // null where prosemirror's own type says undefined
    content: value as never,
    // the json IS the stored template: no html ever crosses this boundary in either direction
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as TemplateNode),
    editorProps: { attributes: { class: 'prose-sm min-h-64 max-w-none p-4 focus:outline-none' } }
  })

  // a different type was picked: the editor keeps its own copy of the document, so it has to be
  // told. guarded, or every keystroke would feed its own output back in and drop the cursor.
  useEffect(() => {
    if (!editor) return
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(value)) return
    editor.commands.setContent(value as never)
  }, [editor, value])

  if (!editor) return null

  const insert = (node: TemplateNode) =>
    editor
      .chain()
      .focus()
      .insertContent(node as never)
      .run()

  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        <Mark active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label={t('documents.bold')}>
          <Bold className="h-4 w-4" />
        </Mark>
        <Mark active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label={t('documents.italic')}>
          <Italic className="h-4 w-4" />
        </Mark>
        <Mark
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label={t('documents.heading')}
        >
          <Heading2 className="h-4 w-4" />
        </Mark>
        <Mark active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label={t('documents.list')}>
          <List className="h-4 w-4" />
        </Mark>

        <span className="mx-2 h-5 w-px bg-border" />

        <Inserter
          placeholder={t('documents.insertField')}
          options={definition.fields.map((field) => ({ key: field.name, label: field.label }))}
          onPick={(key, label) => insert({ type: 'objectField', attrs: { field: key, label } })}
        />
        <Inserter
          placeholder={t('documents.insertValue')}
          options={PLATFORM_VALUES.map((key) => ({ key, label: t(`documents.values.${key}`) }))}
          onPick={(key, label) => insert({ type: 'platformValue', attrs: { value: key, label } })}
        />
        <Inserter
          placeholder={t('documents.insertTable')}
          options={sides.map((side) => ({ key: side.relationship, label: side.label }))}
          onPick={(key, label) => insert({ type: 'relatedTable', attrs: { relationship: key, label } })}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function Mark({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} aria-pressed={active} onClick={onClick} className={cn(active && 'bg-surface-muted')}>
      {children}
    </Button>
  )
}

// a select used as a menu: picking an option inserts and then forgets, so the trigger always reads
// the placeholder rather than the last thing inserted
function Inserter({
  placeholder,
  options,
  onPick
}: {
  placeholder: string
  options: { key: string; label: string }[]
  onPick: (key: string, label: string) => void
}) {
  if (options.length === 0) return null
  return (
    <Select
      value=""
      onValueChange={(key) => {
        const picked = options.find((option) => option.key === key)
        if (picked) onPick(picked.key, picked.label)
      }}
    >
      <SelectTrigger className="h-8 w-auto gap-2 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.key} value={option.key}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
