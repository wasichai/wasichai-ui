import { Node, mergeAttributes } from '@tiptap/core'

// the three things an author drops into running text besides words. all three are atoms: the
// editor treats them as one indivisible character, so a backspace removes the whole chip instead
// of leaving half a field name behind.
//
// they render through renderHTML rather than a React node view on purpose: a node view is a second
// React tree inside the editor, and none of these needs state, a click handler or a fetch.

export const PLATFORM_VALUES = ['today', 'now', 'user', 'id', 'documentName', 'documentPrefix', 'documentSerial', 'documentNumber'] as const

export type PlatformValueKey = (typeof PLATFORM_VALUES)[number]

const CHIP = 'rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand-strong'

export const ObjectField = Node.create({
  name: 'objectField',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    // `field` is what the server validates; `label` is only what the chip shows, and it is
    // re-resolved from the object when the document is issued, so a renamed label is not stale data
    return { field: { default: '' }, label: { default: '' } }
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: CHIP }), `[${node.attrs.label || node.attrs.field}]`]
  }
})

export const PlatformValueNode = Node.create({
  name: 'platformValue',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return { value: { default: 'today' }, label: { default: '' } }
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: CHIP }), `[${node.attrs.label || node.attrs.value}]`]
  }
})

export const RelatedTable = Node.create({
  name: 'relatedTable',
  group: 'block',
  atom: true,

  addAttributes() {
    return { relationship: { default: '' }, label: { default: '' } }
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: 'rounded-md border border-dashed border-border bg-surface-muted px-3 py-2 text-xs text-ink-muted' }),
      `▦ ${node.attrs.label || node.attrs.relationship}`
    ]
  }
})
