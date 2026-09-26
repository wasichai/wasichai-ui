import { useDroppable } from '@dnd-kit/core'
import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Node, Path } from './pageTree'
import { cn } from '@wasichai/ui'
import type { ObjectDefinition, RelatedSide } from '@wasichai/core'

// props every level of the tree needs to keep passing down
export interface SharedCanvasProps {
  selected: string | null
  onSelect: (uid: string | null) => void
  definition: ObjectDefinition
  sides: RelatedSide[]
}

// how Slots draws one child. Canvas and CanvasNode both pass CanvasNode itself here, so this
// module never has to import it back — the tree recursion closes through the caller, not a cycle.
export type NodeRenderer = (props: { node: Node; path: Path } & SharedCanvasProps) => ReactNode

export interface SlotsProps extends SharedCanvasProps {
  entries: { child: Node; index: number }[]
  path: Path
  // where a drop lands when there is nothing to separate, or right after the last item
  end: number
  // which column a slot here belongs to. lets a two-column container's left and right panes,
  // which otherwise share the same path, tell a drop apart (see slotId below).
  column: number
  // what an empty list invites. a dynamic form takes fields, not components, and saying otherwise
  // sends the admin to drag something the drop will refuse.
  emptyLabel?: string
  // which way the list runs. the tab strip is the only row; everything else stacks. it changes the
  // wrapper and the gap's shape, never the ids or the index arithmetic.
  direction?: 'column' | 'row'
  renderNode: NodeRenderer
}

// the one list renderer: a drop zone before every child and one after the last, or a single
// placeholder when there are none. a container splitting by column just calls it twice with two
// filtered entry lists, each still carrying its child's real index in the flat children array.
export function Slots({ entries, path, end, column, direction = 'column', emptyLabel, renderNode, ...shared }: SlotsProps) {
  const row = direction === 'row'
  if (entries.length === 0) return <EmptySlot path={[...path, end]} column={column} row={row} label={emptyLabel} />
  return (
    <div className={row ? 'flex items-end gap-1' : 'space-y-1'}>
      {entries.map(({ child, index }, position) => (
        <Fragment key={child.uid}>
          <Slot path={[...path, index]} column={column} row={row} />
          {renderNode({ node: child, path: [...path, index], ...shared })}
          {position === entries.length - 1 ? <Slot path={[...path, index + 1]} column={column} row={row} /> : null}
        </Fragment>
      ))}
    </div>
  )
}

// slot:<path>:<column> — the path alone cannot tell a two-column container's panes apart, since
// both share the same child indices. applyDrop reads this same shape back off drop.over.
function slotId(path: Path, column: number): string {
  return `slot:${path.join('.')}:${column}`
}

function Slot({ path, column, row }: { path: Path; column: number; row: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId(path, column) })
  if (row) return <div ref={setNodeRef} className={cn('h-8 w-2 rounded-full', isOver && 'w-1 bg-brand')} />
  return <div ref={setNodeRef} className={cn('h-2 rounded-full', isOver && 'h-1 bg-brand')} />
}

function EmptySlot({ path, column, row, label }: { path: Path; column: number; row: boolean; label?: string }) {
  const { t } = useTranslation(['pages', 'common'])
  const { setNodeRef, isOver } = useDroppable({ id: slotId(path, column) })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center justify-center rounded-md border border-dashed border-border text-xs text-ink-muted',
        row ? 'h-8 px-3' : 'h-14',
        isOver && 'border-brand bg-brand-soft text-brand'
      )}
    >
      {label ?? t('pages.dropHere')}
    </div>
  )
}
