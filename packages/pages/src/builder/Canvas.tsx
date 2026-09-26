import { CanvasNode } from './CanvasNode'
import { CanvasRegion } from './CanvasRegion'
import { accepts, countOf, depthOf, insert, move, nodeAt, MAX_COMPONENTS, MAX_DEPTH } from './pageTree'
import type { Node, Path } from './pageTree'
import { parseTabHandle } from './openTabs'
import { NO_SEED, sanitizeModulePatch, type Seed } from './registrySlots'
import { ROW_CLASS, regionStyle } from '@wasichai/core'
import type { NodeRenderer, SharedCanvasProps } from './Slots'
import type { PageComponentType, PageTemplate } from '@wasichai/core'

export interface Drop {
  active: string
  over: string | null
}

// slot:<path>:<column>. the column suffix can be missing (a bare slot:<path>), which means column 1.
function parseSlot(over: string): { to: Path; column: number } {
  const raw = over.slice('slot:'.length)
  const separator = raw.lastIndexOf(':')
  const pathPart = separator === -1 ? raw : raw.slice(0, separator)
  const column = separator === -1 ? 1 : Number(raw.slice(separator + 1))
  return { to: pathPart.split('.').map(Number), column }
}

// where a drop lands: a plain slot, or the end of the tab whose title it was released on. that
// second case is the net under hover-to-open -- a drop on a title before the timer fired would
// otherwise evaporate with nothing to show for it.
function target(tree: Node[], over: string): { to: Path; column: number } | null {
  if (over.startsWith('slot:')) return parseSlot(over)
  const handle = parseTabHandle(over)
  if (!handle) return null
  const tabPath = pathOf(tree, handle.tab)
  const tab = tabPath ? nodeAt(tree, tabPath) : null
  if (!tabPath || !tab) return null
  return { to: [...tabPath, tab.children.length], column: 1 }
}

// one place where a drop becomes a tree. the canvas renders; DndProvider decides when to call this.
// seed: a module's starting values for a fresh node (gis MAP, workflow's ACTION kind), from the registry
export function applyDrop(tree: Node[], drop: Drop, seed: Seed = NO_SEED): Node[] {
  if (!drop.over) return tree
  const landing = target(tree, drop.over)
  if (!landing) return tree
  const { to, column } = landing

  // field:<name>. its own branch on purpose: everything that is not palette: falls through to the
  // move branch below, where pathOf returns null and the drop evaporates without a word.
  if (drop.active.startsWith('field:')) {
    const name = drop.active.slice('field:'.length)
    const parent = to.length > 1 ? nodeAt(tree, to.slice(0, -1)) : null
    if (!accepts(parent?.type ?? null, 'FIELD')) return tree
    if (countOf(tree) >= MAX_COMPONENTS) return tree
    // the same field twice on one form is a slip of the drag; the server refuses it either way
    if (parent?.children.some((child) => child.field === name)) return tree
    return insert(tree, to, { ...blank('FIELD'), column, field: name })
  }

  if (drop.active.startsWith('palette:')) {
    const type = drop.active.slice('palette:'.length) as PageComponentType
    const parent = to.length > 1 ? nodeAt(tree, to.slice(0, -1)) : null
    if (!accepts(parent?.type ?? null, type)) return tree
    if (countOf(tree) >= MAX_COMPONENTS) return tree
    const fresh: Node = { ...blank(type), ...seeded(seed, type), column }
    if (to.length - 1 + depthOf([fresh]) > MAX_DEPTH) return tree
    return insert(tree, to, fresh)
  }

  const uid = drop.active.slice('node:'.length)
  const from = pathOf(tree, uid)
  return from ? move(tree, from, to, { column }) : tree
}

// depth-first search for a uid, returning the index path down to it. exported: DndProvider's own
// drag overlay needs to look up the node being dragged by the same uid applyDrop reads off it.
export function pathOf(tree: Node[], uid: string): Path | null {
  for (let index = 0; index < tree.length; index += 1) {
    if (tree[index].uid === uid) return [index]
    const nested = pathOf(tree[index].children, uid)
    if (nested) return [index, ...nested]
  }
  return null
}

// a fresh node, every field defaulted. a tab strip with no tabs is nothing to look at, so it gets one.
// an ACTION with no action/style is a node the inspector shows with a kind and a style but the
// server refuses to save: radix does not fire onValueChange for a re-pick of the value already
// shown, so the field the inspector displays must already be the field the node carries. the seed
// swaps NAVIGATE for a module's kind when one is installed.
function blank(type: PageComponentType): Node {
  return {
    uid: crypto.randomUUID(),
    type,
    column: 1,
    title: null,
    layout: 'single-column',
    children: type === 'TABS' ? [blank('TAB')] : [],
    relationship: null,
    fields: null,
    field: null,
    visible: null,
    editable: null,
    content: null,
    ...(type === 'ACTION' ? { action: 'NAVIGATE', style: 'SECONDARY' } : {})
  }
}

// a seed fills settings only: the node's type, its column, its children and its uid stay the builder's
function seeded(seed: Seed, type: PageComponentType): Partial<Node> {
  const { column: _column, ...settings } = sanitizeModulePatch(seed(type))
  return settings as Partial<Node>
}

export interface CanvasProps extends SharedCanvasProps {
  tree: Node[]
  // the top-level arrangement now comes from the object's template, not a stored column count.
  template: PageTemplate
}

// pure rendering: the tree, laid out. drag and drop, and the shared DndContext the palette also
// needs, live one level up in DndProvider — a canvas cannot own a context the palette must join.
export function Canvas({ tree, template, selected, onSelect, definition, sides }: CanvasProps) {
  const renderNode: NodeRenderer = (props) => <CanvasNode {...props} />
  const shared = { selected, onSelect, definition, sides, renderNode }

  // the root is always a PAGE node, one REGION per slot the template declares (Task 8/9).
  const root = tree[0]
  if (!root || root.type !== 'PAGE') return null

  return (
    <div className="space-y-3">
      {template.rows.map((row, position) => (
        <div key={position} className={ROW_CLASS}>
          {row.regions.map((slot) => {
            // the template speaks keys, Slots and applyDrop speak index paths. bridge them here,
            // once, and pass the real index down.
            const index = root.children.findIndex((child) => child.region === slot.name)
            if (index === -1) return null
            return (
              <div key={slot.name} style={regionStyle(slot.span)} className="min-w-0">
                <CanvasRegion node={root.children[index]} path={[0, index]} {...shared} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
