import type { PageComponent, PageComponentType } from '@wasichai/core'

// the same bounds the server enforces. refusing at the cursor beats refusing at the request.
export const MAX_DEPTH = 12
export const MAX_COMPONENTS = 200

// a component plus an id the editor owns. dnd-kit needs an identifier that survives a drag, and
// an index path does not: it changes the instant anything moves. the uid never reaches the server.
// extends, never Omit<>: core's PageComponent has an index signature, and Omit over one drops every named key
export interface Node extends PageComponent {
  uid: string
  children: Node[]
}

// index path from the root. [0, 2, 1] is the second child of the third child of the first node.
export type Path = number[]

const CONTAINERS: PageComponentType[] = ['TABS', 'TAB', 'SECTION', 'PAGE', 'REGION', 'DYNAMIC_FORM']

export function isContainer(type: PageComponentType): boolean {
  return CONTAINERS.includes(type)
}

// the page is the root the tree was built around, and its regions come from the template. both are
// furniture: no drop makes one, no drag moves one. inside a region the old rules stand -- a tab
// strip holds only tabs, a tab lives nowhere but a strip, everything else is free.
export function accepts(parent: PageComponentType | null, child: PageComponentType): boolean {
  // child side first: narrowing parent early makes tsc call a later parent check unreachable
  if (child === 'PAGE' || child === 'REGION') return false
  if (parent === null || parent === 'PAGE') return false
  if (child === 'TAB') return parent === 'TABS'
  if (parent === 'TABS') return false
  // a dynamic form is a list of the object's fields and nothing else; a field lives nowhere else.
  // both lines sit before the isContainer fallback, which would otherwise let a form take anything.
  if (child === 'FIELD') return parent === 'DYNAMIC_FORM'
  if (parent === 'DYNAMIC_FORM') return false
  return isContainer(parent)
}

export function nodeAt(tree: Node[], at: Path): Node | null {
  if (at.length === 0) return null
  const [head, ...rest] = at
  const node = tree[head]
  if (!node) return null
  return rest.length === 0 ? node : nodeAt(node.children, rest)
}

export function insert(tree: Node[], at: Path, node: Node): Node[] {
  if (at.length === 1) {
    const next = [...tree]
    next.splice(at[0], 0, node)
    return next
  }
  const [head, ...rest] = at
  return tree.map((child, index) => (index === head ? { ...child, children: insert(child.children, rest, node) } : child))
}

export function remove(tree: Node[], at: Path): Node[] {
  if (at.length === 1) return tree.filter((_, index) => index !== at[0])
  const [head, ...rest] = at
  return tree.map((child, index) => (index === head ? { ...child, children: remove(child.children, rest) } : child))
}

// patch is applied to the moved node itself, e.g. a canvas drop relabelling which column it lands in
export function move(tree: Node[], from: Path, to: Path, patch: Partial<Node> = {}): Node[] {
  if (!canDrop(tree, from, to)) return tree
  const node = nodeAt(tree, from)
  if (!node) return tree
  return insert(remove(tree, from), shifted(from, to), { ...node, ...patch })
}

// taking a node out moves every later index in its own container up by one, target included
function shifted(from: Path, to: Path): Path {
  const parent = from.slice(0, -1)
  const index = from[from.length - 1]
  const sameParent = to.length > parent.length && parent.every((step, position) => step === to[position])
  if (sameParent && to[parent.length] > index) {
    const next = [...to]
    next[parent.length] -= 1
    return next
  }
  return to
}

export function canDrop(tree: Node[], from: Path, to: Path): boolean {
  const node = nodeAt(tree, from)
  if (!node) return false
  // into itself or into one of its own descendants: the result would not be a tree
  if (to.length >= from.length && from.every((step, position) => step === to[position])) return false
  const parent = to.length > 1 ? nodeAt(tree, to.slice(0, -1)) : null
  if (to.length > 1 && !parent) return false
  if (!accepts(parent?.type ?? null, node.type)) return false
  return to.length - 1 + depthOf([node]) <= MAX_DEPTH
}

export function depthOf(tree: Node[]): number {
  return tree.reduce((deepest, node) => Math.max(deepest, 1 + depthOf(node.children)), 0)
}

export function countOf(tree: Node[]): number {
  return tree.reduce((total, node) => total + 1 + countOf(node.children), 0)
}

export function withIds(components: PageComponent[]): Node[] {
  return components.map((component) => ({ ...component, uid: crypto.randomUUID(), children: withIds(component.children) }))
}

export function toDefinition(tree: Node[]): PageComponent[] {
  return tree.map(({ uid: _uid, ...component }) => ({ ...component, children: toDefinition(component.children) }))
}

// which of a two-column container's children fall in the given column, keeping each child's real
// index so a drop still lands at the right position in the flat array it came from. shared by a
// SECTION's own children (CanvasNode) and the page's own root children (Canvas): both are just a
// list of siblings with a column number, one drawn by the canvas as a container, one as the page.
export function columnEntries(children: Node[], column: 1 | 2): { child: Node; index: number }[] {
  return children.map((child, index) => ({ child, index })).filter((entry) => (column === 2 ? entry.child.column === 2 : entry.child.column !== 2))
}
