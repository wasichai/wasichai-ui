import { cn } from '@wasichai/ui'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { useId, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router'
import { currentNavTreeLeaf, isNavTreeGroup, type NavTreeGroup, type NavTreeLeaf, type NavTreeNode } from './navTreeNodes'

export interface NavTreeProps<L extends NavTreeLeaf = NavTreeLeaf> {
  id?: string
  // the <nav>'s aria-label
  label: string
  // the bold title over the groups: "Mis trámites", "Ventanilla"
  title: string
  nodes: NavTreeNode<L>[]
  // where the way home goes: the library hardcodes no route
  homeTo: string
  // folded, the panel is hidden; whoever folded it shows a way back
  open: boolean
  // which groups are open, by key (a group's labels from the root, joined by "/"); a group not in it is open
  groups: Record<string, boolean>
  onToggleGroup: (key: string) => void
  onNavigate: () => void
  onFold: () => void
}

interface Context {
  groups: Record<string, boolean>
  onToggleGroup: (key: string) => void
  onNavigate: () => void
  current: NavTreeLeaf | undefined
}

// the portal-tributario prototype's tree menu, with tokens: a light panel headed by the way home and a button that
// folds it, a title, and groups (buttons with a caret, folding their leaves) of leaves in the link colour, the current
// one marked on its left, in bold and with a chevron. the data-slot hooks let a theme refine it (ui's nav.css)
export function NavTree<L extends NavTreeLeaf>({ id, label, title, nodes, homeTo, open, groups, onToggleGroup, onNavigate, onFold }: NavTreeProps<L>) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const context: Context = { groups, onToggleGroup, onNavigate, current: currentNavTreeLeaf(nodes, pathname) }
  return (
    <nav
      id={id}
      aria-label={label}
      data-slot="nav-tree"
      hidden={!open}
      // on a phone, over the whole row: a pick folds it
      className="w-73 shrink-0 overflow-y-auto border-r border-border bg-table-head max-sm:w-full print:hidden"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-4 pt-3.5 pb-3">
        <Home aria-hidden className="size-[17px] shrink-0 text-link" strokeWidth={1.9} />
        <NavLink to={homeTo} end onClick={onNavigate} className="min-w-0 flex-1 text-base text-link hover:underline">
          {t('common.goHome')}
        </NavLink>
        <button
          type="button"
          aria-label={t('common.hideMenu')}
          aria-controls={id}
          onClick={onFold}
          className="grid size-6 shrink-0 place-items-center rounded text-link hover:bg-ink/4"
        >
          <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.6} />
        </button>
      </div>
      <p className="px-4 pt-4 pb-2.5 text-lg leading-tight font-bold text-link">{title}</p>
      <Nodes nodes={nodes} level={0} parent="" context={context} />
    </nav>
  )
}

function Nodes({
  nodes,
  level,
  parent,
  context,
  id,
  hidden
}: {
  nodes: NavTreeNode[]
  level: number
  parent: string
  context: Context
  id?: string
  hidden?: boolean
}) {
  return (
    <ul id={id} hidden={hidden} className={cn(level === 0 && 'pb-4')}>
      {nodes.map((node) =>
        isNavTreeGroup(node) ? (
          <Group key={node.label} group={node} level={level} groupKey={parent + node.label} context={context} />
        ) : (
          <li key={node.to}>
            <Leaf leaf={node} level={level} current={node === context.current} onNavigate={context.onNavigate} />
          </li>
        )
      )}
    </ul>
  )
}

// a group (17px) or a subgroup (16px, indented): a button that folds its list, the caret turned while it is open
function Group({ group, level, groupKey, context }: { group: NavTreeGroup; level: number; groupKey: string; context: Context }) {
  const list = useId()
  const open = context.groups[groupKey] !== false
  const sub = level > 0
  return (
    <li>
      <button
        type="button"
        data-slot="nav-tree-group"
        aria-expanded={open}
        aria-controls={list}
        onClick={() => context.onToggleGroup(groupKey)}
        className={cn(
          'flex w-full items-center gap-[9px] text-left font-bold text-ink hover:text-link focus-visible:-outline-offset-2',
          sub ? 'py-[9px] pr-3.5 pl-[26px] text-base' : 'px-3.5 py-2.5 text-[17px]'
        )}
      >
        <Caret open={open} sub={sub} />
        <span className="min-w-0 flex-1">{group.label}</span>
      </button>
      <Nodes id={list} hidden={!open} nodes={group.children} level={level + 1} parent={`${groupKey}/`} context={context} />
    </li>
  )
}

// the prototype's caret: a small triangle that turns to point down, still when the user asks for less motion
function Caret({ open, sub }: { open: boolean; sub: boolean }) {
  return (
    <span
      aria-hidden
      data-slot="nav-tree-caret"
      className={cn(
        'grid shrink-0 place-items-center text-ink-muted transition-transform duration-130 motion-reduce:transition-none',
        sub ? 'size-[13px]' : 'size-3.5',
        open && 'rotate-90'
      )}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className={sub ? 'size-[9px]' : 'size-2.5'}>
        <path d="M8 5l10 7-10 7z" />
      </svg>
    </span>
  )
}

// a leaf: 15px in the link colour, indented under its group (deeper under a subgroup). one at the root, beside the
// groups (the administration), takes their type, with its icon, if any, where they have the caret
function Leaf({ leaf, level, current, onNavigate }: { leaf: NavTreeLeaf; level: number; current: boolean; onNavigate: () => void }) {
  const common = { leaf, 'aria-current': current ? ('page' as const) : undefined, onClick: leaf.external ? undefined : onNavigate }
  if (level === 0) {
    const Icon = leaf.icon
    return (
      <Anchor
        {...common}
        data-slot="nav-tree-group"
        className="flex w-full items-center gap-[9px] px-3.5 py-2.5 text-[17px] font-bold text-ink hover:text-link focus-visible:-outline-offset-2"
      >
        <span aria-hidden data-slot="nav-tree-caret" className="grid size-3.5 shrink-0 place-items-center text-ink-muted">
          {Icon && <Icon className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1">{leaf.label}</span>
      </Anchor>
    )
  }
  return (
    <Anchor
      {...common}
      data-slot="nav-tree-leaf"
      className={cn(
        'flex items-center gap-2 border-l-4 py-[9px] pr-3.5 text-[15px] leading-[1.35] text-link focus-visible:-outline-offset-2',
        level > 1 ? 'pl-[48px]' : 'pl-[34px]',
        current ? 'border-link bg-ink/6 font-bold' : 'border-transparent hover:bg-ink/4'
      )}
    >
      <span className="min-w-0 flex-1">{leaf.label}</span>
      {current && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-link" strokeWidth={3} />}
    </Anchor>
  )
}

// a page of the app goes through the router; another app (external) is a plain link, loaded in full. Link, not
// NavLink: its prefix match would mark Buscar and Nuevo contribuyente at once, so aria-current comes from the rule
function Anchor({ leaf, ...props }: { leaf: NavTreeLeaf } & Omit<ComponentProps<'a'>, 'href'>) {
  return leaf.external ? <a href={leaf.to} {...props} /> : <Link to={leaf.to} {...props} />
}
