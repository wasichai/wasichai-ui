import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

// radix's select cannot be driven in jsdom (pointer-events: none on its trigger), so it is doubled
// by a real <select>, the same way PageBuilderPage.test.tsx does it. the inserters are menus here,
// so the double carries the placeholder as its accessible name.
vi.mock('@wasichai/ui', async (importOriginal) => {
  const placeholderOf = (children: ReactNode): string => {
    let found = ''
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return
      const element = node as { props?: { placeholder?: string; children?: unknown } }
      if (element.props?.placeholder) found = element.props.placeholder
      const kids = element.props?.children
      if (Array.isArray(kids)) kids.forEach(walk)
      else if (kids) walk(kids)
    }
    if (Array.isArray(children)) children.forEach(walk)
    else walk(children)
    return found
  }
  return {
    ...(await importOriginal<typeof import('@wasichai/ui')>()),
    SelectTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <>{placeholder}</>,
    SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => <option value={value}>{children}</option>,
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children?: ReactNode }) => (
      <select aria-label={placeholderOf(children)} value={value} onChange={(event) => onValueChange(event.target.value)}>
        <option value="" />
        {children}
      </select>
    )
  }
})

import { EMPTY_TEMPLATE, TemplateEditor } from './TemplateEditor'
import { renderWithProviders } from '@wasichai/testing'
import { coreModule } from '@wasichai/core'
import type { FieldMeta, ObjectDefinition, RelatedSide } from '@wasichai/core'
import type { TemplateNode } from './types'
import { documentsModule } from './module'

function meta(name: string, label: string): FieldMeta {
  return {
    id: name,
    name,
    label,
    type: 'TEXT',
    required: false,
    unique: false,
    defaultValue: null,
    description: null,
    position: 0,
    enumOptions: null,
    relationTarget: null,
    geometry: null,
    visible: true,
    editable: true
  }
}

const definition: ObjectDefinition = {
  id: 'o-1',
  name: 'predio',
  label: 'Predio',
  pluralLabel: 'Predios',
  description: null,
  enabled: true,
  geometry: null,
  fields: [meta('codigo', 'Código'), meta('direccion', 'Dirección')]
}

const sides: RelatedSide[] = [
  { relationship: 'predio_titular', label: 'Titulares', type: 'ONE_TO_MANY', objectName: 'titular', objectLabel: 'Titular', many: true }
]

function open(value: TemplateNode = EMPTY_TEMPLATE, onChange = vi.fn()) {
  renderWithProviders(<TemplateEditor value={value} onChange={onChange} definition={definition} sides={sides} />, { modules: [coreModule, documentsModule()] })
  return onChange
}

describe('TemplateEditor', () => {
  it('offers every field of the object as something to insert', async () => {
    open()
    const menu = await screen.findByRole('combobox', { name: 'Campo' })
    expect(within(menu).getByRole('option', { name: 'Código' })).toBeInTheDocument()
    expect(within(menu).getByRole('option', { name: 'Dirección' })).toBeInTheDocument()
  })

  it('inserting a field puts a node naming it into the document, not its label', async () => {
    const onChange = open()
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Campo' }), 'codigo')

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const doc = onChange.mock.calls.at(-1)![0] as TemplateNode
    const inserted = doc.content?.[0]?.content?.[0]
    // `field` is the key the server validates; the label is only what the chip shows
    expect(inserted?.type).toBe('objectField')
    expect(inserted?.attrs?.field).toBe('codigo')
  })

  it('inserting a date puts a platform value in, resolved later and never now', async () => {
    const onChange = open()
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Valor' }), 'today')

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const doc = onChange.mock.calls.at(-1)![0] as TemplateNode
    const inserted = doc.content?.[0]?.content?.[0]
    expect(inserted?.type).toBe('platformValue')
    expect(inserted?.attrs?.value).toBe('today')
    // the template stores the key, never a date: a template that froze today's date at authoring
    // time would print the wrong day on every document it ever issued
    expect(JSON.stringify(doc)).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('offers the object relationships as tables', async () => {
    open()
    const menu = await screen.findByRole('combobox', { name: 'Tabla' })
    expect(within(menu).getByRole('option', { name: 'Titulares' })).toBeInTheDocument()
  })

  it('draws a stored template back, chips and all', async () => {
    open({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Berlín, ' },
            { type: 'platformValue', attrs: { value: 'today', label: 'Fecha' } }
          ]
        }
      ]
    })
    expect(await screen.findByText(/Berlín/)).toBeInTheDocument()
    expect(await screen.findByText('[Fecha]')).toBeInTheDocument()
  })

  // the whole point of storing prosemirror json instead of html: text that looks like markup is
  // text, and there is no sink in this app that would ever interpret it
  it('keeps text that looks like html as text', async () => {
    open({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Revisar el <b>plano</b>' }] }] })
    expect(await screen.findByText('Revisar el <b>plano</b>')).toBeInTheDocument()
  })
})
