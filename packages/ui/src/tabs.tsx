import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from './cn'

export interface TabSpec {
  id: string
  label: string
  render: () => ReactNode
}

// a tab panel is mounted the first time it is opened and stays mounted, hidden, afterwards.
// mounting matters: the related list, the history and the workflow panel each fetch on mount, so
// an unopened tab must not exist. staying matters: a form that unmounts loses what was typed.
// the keyboard is WAI-ARIA's with manual activation: the arrows, Home and End move the focus along
// the strip and Enter or Space opens the focused tab. opening on focus would mount every tab crossed.
export function Tabs({ tabs, label }: { tabs: TabSpec[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')
  const [opened, setOpened] = useState<string[]>(tabs[0] ? [tabs[0].id] : [])
  // dom ids of its own: a caller's id may hold spaces, or repeat one of another strip on the page
  const base = useId()
  const strip = useRef<HTMLDivElement>(null)

  // a tab that disappeared while it was open leaves the strip pointing at nothing
  const current = tabs.some((tab) => tab.id === active) ? active : (tabs[0]?.id ?? '')

  const open = (id: string) => {
    setActive(id)
    // the tab the strip fell back to was never opened by hand: keep it mounted all the same
    setOpened((list) => [...new Set([...list, current, id])])
  }

  const move = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1
    const keys: Record<string, number> = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }
    if (!Object.hasOwn(keys, event.key)) return
    event.preventDefault()
    strip.current?.querySelectorAll<HTMLElement>('[role="tab"]')[keys[event.key]]?.focus()
  }

  if (tabs.length === 0) return null

  // data-slot: hooks a theme sheet styles (ADR-035)
  return (
    <div data-slot="tabs">
      <div ref={strip} role="tablist" aria-label={label} data-slot="tabs-list" className="flex gap-1 overflow-x-auto border-b border-border px-8">
        {tabs.map((tab, index) => {
          const selected = tab.id === current
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-slot="tabs-trigger"
              id={`${base}-tab-${index}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${index}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => open(tab.id)}
              onKeyDown={(event) => move(event, index)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                selected ? 'border-brand text-brand-strong' : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {tabs.map((tab, index) =>
        opened.includes(tab.id) || tab.id === current ? (
          <div
            key={tab.id}
            role="tabpanel"
            data-slot="tabs-content"
            id={`${base}-panel-${index}`}
            aria-labelledby={`${base}-tab-${index}`}
            hidden={tab.id !== current}
          >
            {tab.render()}
          </div>
        ) : null
      )}
    </div>
  )
}
