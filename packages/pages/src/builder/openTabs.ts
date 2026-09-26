import type { Node } from './pageTree'

// how long a drag has to rest on a tab title before that tab opens under it
export const HOVER_OPEN_MS = 500

// tab:<strip uid>:<tab uid>. a closed tab has no slots -- hovering its title is the only way in,
// so the title needs an id of its own just to be something dnd-kit can see.
export function tabHandleId(strip: string, tab: string): string {
  return `tab:${strip}:${tab}`
}

export function parseTabHandle(id: string): { strip: string; tab: string } | null {
  if (!id.startsWith('tab:')) return null
  const parts = id.slice('tab:'.length).split(':')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return { strip: parts[0], tab: parts[1] }
}

// which tab is open. the remembered one while it still exists, else the first -- a tab can be
// deleted or moved away while it is the open one.
export function currentTab(children: Node[], remembered: string | null): string | null {
  if (remembered && children.some((child) => child.uid === remembered)) return remembered
  return children[0]?.uid ?? null
}

export interface HoverInput {
  activeId: string
  overId: string | null
  stripUid: string
  // the strip's own tabs, so a tab being dragged among them is recognised as a reorder
  tabUids: string[]
  open: string | null
}

// the whole hover decision as a value: which tab this drag should open, or null for leave it alone.
// pure on purpose -- jsdom cannot drag, so this is the only part of hover-to-open a test can hold.
export function hoverTarget({ activeId, overId, stripUid, tabUids, open }: HoverInput): string | null {
  if (!overId) return null
  const handle = parseTabHandle(overId)
  if (!handle || handle.strip !== stripUid) return null
  // dragging a tab among its own siblings is reordering, not filling: opening each one under the
  // pointer would resize the canvas mid-drag and move the gap the drop was aimed at.
  if (tabUids.some((uid) => activeId === `node:${uid}`)) return null
  if (handle.tab === open) return null
  return handle.tab
}
