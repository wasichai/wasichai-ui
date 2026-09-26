import { useState, type ReactNode } from 'react'
import { cn } from './cn'

export interface TabSpec {
  id: string
  label: string
  render: () => ReactNode
}

// a tab panel is mounted the first time it is opened and stays mounted, hidden, afterwards.
// mounting matters: the related list, the history and the workflow panel each fetch on mount, so
// an unopened tab must not exist. staying matters: a form that unmounts loses what was typed.
export function Tabs({ tabs, label }: { tabs: TabSpec[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')
  const [opened, setOpened] = useState<string[]>(tabs[0] ? [tabs[0].id] : [])

  // a tab that disappeared while it was open leaves the strip pointing at nothing
  const current = tabs.some((tab) => tab.id === active) ? active : (tabs[0]?.id ?? '')

  const open = (id: string) => {
    setActive(id)
    setOpened((current) => (current.includes(id) ? current : [...current, id]))
  }

  if (tabs.length === 0) return null

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border px-8">
        {tabs.map((tab) => {
          const selected = tab.id === current
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => open(tab.id)}
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

      {tabs
        .filter((tab) => opened.includes(tab.id))
        .map((tab) => (
          <div key={tab.id} role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={tab.id !== current}>
            {tab.render()}
          </div>
        ))}
    </div>
  )
}
