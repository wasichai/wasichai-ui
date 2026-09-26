import { useDraggable } from '@dnd-kit/core'
import { useTranslation } from 'react-i18next'
import { columnEntries, isContainer } from './pageTree'
import type { Node, Path } from './pageTree'
import { CanvasTabs } from './CanvasTabs'
import { ComponentMock } from './preview/ComponentMock'
import { Slots } from './Slots'
import type { SharedCanvasProps } from './Slots'
import { cn } from '@wasichai/ui'

export interface CanvasNodeProps extends SharedCanvasProps {
  node: Node
  path: Path
}

// one node on the canvas. a container draws its own frame and recurses through Slots, passing
// itself back in as the renderer; a leaf draws its mock. the whole thing is draggable and
// clicking it selects it for the inspector.
export function CanvasNode({ node, path, selected, onSelect, definition, sides }: CanvasNodeProps) {
  const { t } = useTranslation(['pages', 'common'])
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'node:' + node.uid })
  const shared: SharedCanvasProps = { selected, onSelect, definition, sides }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(event) => {
        // a click on a nested node must not also select its ancestors
        event.stopPropagation()
        onSelect(node.uid)
      }}
      className={cn('cursor-grab rounded-md border border-border bg-surface p-2', selected === node.uid && 'ring-2 ring-brand', isDragging && 'opacity-50')}
    >
      {node.type === 'TABS' ? (
        <CanvasTabs node={node} path={path} renderNode={renderChild} {...shared} />
      ) : isContainer(node.type) ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <span>{t(`pages.types.${node.type}`)}</span>
            {node.title ? <span className="text-ink">{node.title}</span> : null}
          </div>
          {node.layout === 'two-column' ? (
            <div className="grid grid-cols-2 gap-3">
              <Slots entries={columnEntries(node.children, 1)} path={path} end={node.children.length} column={1} {...shared} renderNode={renderChild} />
              <Slots entries={columnEntries(node.children, 2)} path={path} end={node.children.length} column={2} {...shared} renderNode={renderChild} />
            </div>
          ) : (
            <Slots
              entries={node.children.map((child, index) => ({ child, index }))}
              path={path}
              end={node.children.length}
              column={1}
              emptyLabel={node.type === 'DYNAMIC_FORM' ? t('pages.dynamicFormEmpty') : undefined}
              {...shared}
              renderNode={renderChild}
            />
          )}
        </div>
      ) : (
        <ComponentMock component={node} definition={definition} sides={sides} />
      )}
    </div>
  )
}

// the recursion step: a container's own children are drawn by this same component
function renderChild(props: CanvasNodeProps) {
  return <CanvasNode {...props} />
}
