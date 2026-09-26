import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { applyDrop, pathOf } from './Canvas'
import { nodeAt } from './pageTree'
import type { Node } from './pageTree'
import { useSeed, useTypeLabel } from './registrySlots'

export interface DndProviderProps {
  tree: Node[]
  onChange: (next: Node[]) => void
  children: ReactNode
}

// one shared drag context for the whole builder. a drag that starts on a palette item has to be
// able to end on a canvas slot, so the palette and the canvas cannot each keep their own
// DndContext — dnd-kit's default (contextless) draggables render the right aria attributes but
// talk to nobody. the pointer sensor needs a distance before it counts as a drag, or it swallows
// every plain click: dnd-kit stops the click event that follows an activated pointerdown, and
// with no constraint every pointerdown activates immediately.
export function DndProvider({ tree, onChange, children }: DndProviderProps) {
  const seed = useSeed()
  const typeLabel = useTypeLabel()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor))
  const [activeId, setActiveId] = useState<string | null>(null)

  const label = dragLabel(tree, activeId, typeLabel)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={(event: DragEndEvent) => {
        setActiveId(null)
        onChange(applyDrop(tree, { active: String(event.active.id), over: event.over ? String(event.over.id) : null }, seed))
      }}
    >
      {children}
      <DragOverlay>{label ? <div className="rounded-md border border-brand bg-surface px-3 py-1.5 text-sm shadow-lg">{label}</div> : null}</DragOverlay>
    </DndContext>
  )
}

// what the overlay shows while dragging: a fresh type's label, or a placed node's own title
function dragLabel(tree: Node[], activeId: string | null, typeLabel: (type: string) => string): string | null {
  if (!activeId) return null
  if (activeId.startsWith('palette:')) return typeLabel(activeId.slice('palette:'.length))
  // a field drags under its own name: it is the one thing on the canvas the admin did not pick a type for
  if (activeId.startsWith('field:')) return activeId.slice('field:'.length)
  const uid = activeId.slice('node:'.length)
  const path = pathOf(tree, uid)
  const node = path ? nodeAt(tree, path) : null
  return node ? (node.title ?? typeLabel(node.type)) : null
}
