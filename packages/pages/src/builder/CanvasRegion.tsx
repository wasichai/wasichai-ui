import { useTranslation } from 'react-i18next'
import { columnEntries, type Node, type Path } from './pageTree'
import { Slots } from './Slots'
import type { NodeRenderer, SharedCanvasProps } from './Slots'
import { cn } from '@wasichai/ui'

export interface CanvasRegionProps extends SharedCanvasProps {
  node: Node
  path: Path
  renderNode: NodeRenderer
}

// one region. selectable, so the inspector can set how many columns its content takes -- but still
// never draggable and never deletable: the template owns which regions exist. the click sits on the
// region's own chrome only; a click on a child stops at the child, so this never comes between a
// click and the node it was aimed at, which is how the click-vs-drag fix gets broken again.
export function CanvasRegion({ node, path, ...shared }: CanvasRegionProps) {
  const { t } = useTranslation(['pages', 'common'])
  const { selected, onSelect } = shared
  const entries = node.children.map((child, index) => ({ child, index }))
  return (
    <div className={cn('rounded-md border border-border bg-surface/40', selected === node.uid && 'ring-2 ring-brand')}>
      <button
        type="button"
        className="w-full px-3 pt-2 text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted"
        onClick={(event) => {
          event.stopPropagation()
          onSelect(node.uid)
        }}
      >
        {t(`pages.regions.${node.region}`, { defaultValue: node.region ?? '' })}
      </button>
      <div className="p-2">
        {node.layout === 'two-column' ? (
          // testid mirrors the renderer's page-column-N so canvas and record page are checked the same way
          <div className="grid grid-cols-2 gap-3">
            <div data-testid="region-column-1">
              <Slots entries={columnEntries(node.children, 1)} path={path} end={node.children.length} column={1} {...shared} />
            </div>
            <div data-testid="region-column-2">
              <Slots entries={columnEntries(node.children, 2)} path={path} end={node.children.length} column={2} {...shared} />
            </div>
          </div>
        ) : (
          <Slots entries={entries} path={path} end={node.children.length} column={1} {...shared} />
        )}
      </div>
    </div>
  )
}
