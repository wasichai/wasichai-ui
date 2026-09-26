import { useDndMonitor, useDraggable, useDroppable } from '@dnd-kit/core'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { currentTab, hoverTarget, HOVER_OPEN_MS, tabHandleId } from './openTabs'
import type { Node, Path } from './pageTree'
import { Slots } from './Slots'
import type { NodeRenderer, SharedCanvasProps } from './Slots'
import { cn } from '@wasichai/ui'

export interface CanvasTabsProps extends SharedCanvasProps {
  node: Node
  path: Path
  renderNode: NodeRenderer
}

// the canvas draws a tab strip the way the record page will: one tab open at a time. a closed tab
// has no slots, so a component gets there by opening the tab first.
//
// hover-to-open is wired below and DOES NOT FIRE yet -- measured in a browser, not assumed. a tab
// title's droppable rect comes back with the right left/right and a top offset by ~400px, the
// builder's scroll container, so pointerWithin (viewport coordinates against those rects) never
// matches it. rectIntersection only survives the offset because both sides carry it. aligning the
// two spaces is the fix; three attempts missed it and were reverted rather than shipped.
//
// forked from components/ui/tabs.tsx rather than reused: that one owns its open tab in private
// state, and hover has to drive this one from outside. the class strings below are copied from it
// on purpose -- the builder and the record page must look like the same strip.
export function CanvasTabs({ node, path, renderNode, ...shared }: CanvasTabsProps) {
  const { t } = useTranslation(['pages', 'common'])
  const { selected, onSelect } = shared
  // by uid, never by index path: a path changes the moment anything moves, a uid survives the drag
  const [remembered, setRemembered] = useState<string | null>(null)
  const open = currentTab(node.children, remembered)
  const openIndex = node.children.findIndex((child) => child.uid === open)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => cancel, [])

  useDndMonitor({
    onDragOver: ({ active, over }) => {
      cancel()
      const target = hoverTarget({
        activeId: String(active.id),
        overId: over ? String(over.id) : null,
        stripUid: node.uid,
        tabUids: node.children.map((child) => child.uid),
        open
      })
      if (target) timer.current = setTimeout(() => setRemembered(target), HOVER_OPEN_MS)
    },
    onDragEnd: cancel,
    onDragCancel: cancel
  })

  const openTab = openIndex >= 0 ? node.children[openIndex] : null

  return (
    <div className="space-y-2">
      <div role="tablist" aria-label={t('pages.tabs.builderLabel')} className="flex gap-1 overflow-x-auto border-b border-border">
        <Slots
          entries={node.children.map((child, index) => ({ child, index }))}
          path={path}
          end={node.children.length}
          column={1}
          direction="row"
          renderNode={({ node: tab }) => (
            <TabTitle
              key={tab.uid}
              tab={tab}
              strip={node.uid}
              open={open === tab.uid}
              selected={selected === tab.uid}
              onSelect={onSelect}
              onOpen={setRemembered}
            />
          )}
          {...shared}
        />
      </div>
      {openTab ? (
        <div role="tabpanel" id={`canvas-panel-${openTab.uid}`} aria-labelledby={`canvas-tab-${openTab.uid}`}>
          <Slots
            entries={openTab.children.map((child, index) => ({ child, index }))}
            path={[...path, openIndex]}
            end={openTab.children.length}
            column={1}
            renderNode={renderNode}
            {...shared}
          />
        </div>
      ) : null}
    </div>
  )
}

interface TabTitleProps {
  tab: Node
  strip: string
  open: boolean
  selected: boolean
  onSelect: (uid: string | null) => void
  onOpen: (uid: string) => void
}

// one title, doing three jobs on one element: it drags the TAB, it is the droppable hover aims at,
// and its click both opens the tab and selects it. one element and one handler is the rule -- the
// bug this repo already shipped was a wrapper intercepting the pointer before the click landed.
function TabTitle({ tab, strip, open, selected, onSelect, onOpen }: TabTitleProps) {
  const { t } = useTranslation(['pages', 'common'])
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: 'node:' + tab.uid })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: tabHandleId(strip, tab.uid) })
  const count = tab.children.length

  return (
    <button
      ref={(element) => {
        setDragRef(element)
        setDropRef(element)
      }}
      {...listeners}
      {...attributes}
      type="button"
      role="tab"
      id={`canvas-tab-${tab.uid}`}
      aria-selected={open}
      aria-controls={`canvas-panel-${tab.uid}`}
      tabIndex={open ? 0 : -1}
      onClick={(event) => {
        event.stopPropagation()
        onOpen(tab.uid)
        onSelect(tab.uid)
      }}
      className={cn(
        'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
        open ? 'border-brand text-brand-strong' : 'border-transparent text-ink-muted hover:text-ink',
        selected && 'ring-2 ring-brand',
        isOver && 'bg-brand-soft',
        isDragging && 'opacity-50'
      )}
    >
      {tab.title || t('pages.tabs.page')}
      {/* a closed tab's content is out of sight: the count is how you know it is not empty */}
      {count > 0 ? <span className="ml-2 text-[11px] text-ink-muted">{count}</span> : null}
    </button>
  )
}
