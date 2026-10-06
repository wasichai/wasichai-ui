import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from 'lucide-react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { NavTree, type NavTreeProps } from './NavTree'
import type { NavTreeNode } from './navTreeNodes'

// srtm-ui's ArbolNav, generic: groups of leaves or subgroups, the current leaf marked, the panel folded by its caller
const NODES: NavTreeNode[] = [
  {
    label: 'Contribuyentes',
    children: [
      { label: 'Buscar contribuyentes', to: '/contribuyentes' },
      { label: 'Nuevo contribuyente', to: '/contribuyentes/nuevo' }
    ]
  },
  {
    label: 'Tributos',
    children: [
      { label: 'Impuesto predial', children: [{ label: 'Cuenta corriente', to: '/cuenta' }] },
      { label: 'Arbitrios', to: '/arbitrios' }
    ]
  },
  { label: 'Administración', to: '/admin', external: true, icon: Settings }
]

function draw(props: Partial<NavTreeProps> = {}, options: { route?: string; language?: string } = {}) {
  const handlers = { onToggleGroup: vi.fn(), onNavigate: vi.fn(), onFold: vi.fn() }
  const result = renderWithProviders(
    <NavTree id="sidebar" label="Secciones" title="Mis trámites" nodes={NODES} homeTo="/" open groups={{}} {...handlers} {...props} />,
    options
  )
  return { ...result, ...handlers }
}

const nav = () => screen.getByRole('navigation', { name: 'Secciones' })
const current = () => Array.from(nav().querySelectorAll('[aria-current="page"]')).map((element) => element.textContent)

// a click on a plain link would make jsdom navigate (not implemented): keep the page, let react see the click
const stay = (event: Event) => event.preventDefault()
beforeEach(() => document.addEventListener('click', stay))
afterEach(() => document.removeEventListener('click', stay))

describe('NavTree', () => {
  it('draws the panel, the way home and the button that folds it', () => {
    draw()
    expect(nav()).toHaveAttribute('id', 'sidebar')
    expect(nav()).toHaveAttribute('data-slot', 'nav-tree')
    expect(nav()).toHaveClass('w-73', 'bg-table-head', 'border-r', 'border-border')
    expect(within(nav()).getByText('Mis trámites')).toHaveClass('text-lg', 'font-bold', 'text-link')
    const home = within(nav()).getByRole('link', { name: 'Ir al inicio' })
    expect(home).toHaveAttribute('href', '/')
    // home is not a leaf, but the header marks it on its own page
    expect(current()).toEqual(['Ir al inicio'])
    expect(within(nav()).getByRole('button', { name: 'Ocultar el menú' })).toHaveAttribute('aria-controls', 'sidebar')
  })

  it('goes home to the route the caller gives', () => {
    draw({ homeTo: '/inicio' })
    expect(within(nav()).getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/inicio')
  })

  it('draws every group open, a subgroup indented, its leaves deeper', () => {
    draw()
    const group = within(nav()).getByRole('button', { name: 'Contribuyentes' })
    expect(group).toHaveAttribute('aria-expanded', 'true')
    expect(group).toHaveAttribute('data-slot', 'nav-tree-group')
    expect(group).toHaveClass('text-[17px]', 'font-bold', 'text-ink')
    expect(document.getElementById(group.getAttribute('aria-controls')!)).toContainElement(within(nav()).getByRole('link', { name: 'Buscar contribuyentes' }))
    const sub = within(nav()).getByRole('button', { name: 'Impuesto predial' })
    expect(sub).toHaveClass('text-base', 'pl-[26px]')
    const leaf = within(nav()).getByRole('link', { name: 'Buscar contribuyentes' })
    expect(leaf).toHaveAttribute('data-slot', 'nav-tree-leaf')
    expect(leaf).toHaveClass('text-[15px]', 'text-link', 'pl-[34px]')
    expect(within(nav()).getByRole('link', { name: 'Cuenta corriente' })).toHaveClass('pl-[48px]')
    expect(
      within(nav())
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')])
    ).toEqual([
      ['Ir al inicio', '/'],
      ['Buscar contribuyentes', '/contribuyentes'],
      ['Nuevo contribuyente', '/contribuyentes/nuevo'],
      ['Cuenta corriente', '/cuenta'],
      ['Arbitrios', '/arbitrios'],
      ['Administración', '/admin']
    ])
  })

  // the caller keeps which groups are folded, by the labels from the root: two groups of one name stay apart
  it('folds the groups its caller keeps closed and asks to toggle one by its key', async () => {
    const { onToggleGroup } = draw({ groups: { Contribuyentes: false, 'Tributos/Impuesto predial': false } })
    const group = within(nav()).getByRole('button', { name: 'Contribuyentes' })
    const caret = group.querySelector('[data-slot="nav-tree-caret"]')
    expect(group).toHaveAttribute('aria-expanded', 'false')
    expect(caret).not.toHaveClass('rotate-90')
    expect(caret).toHaveClass('transition-transform', 'motion-reduce:transition-none')
    expect(within(nav()).queryByRole('link', { name: 'Buscar contribuyentes' })).not.toBeInTheDocument()
    expect(within(nav()).queryByRole('link', { name: 'Cuenta corriente' })).not.toBeInTheDocument()
    expect(within(nav()).getByRole('button', { name: 'Tributos' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(nav()).getByRole('button', { name: 'Tributos' }).querySelector('[data-slot="nav-tree-caret"]')).toHaveClass('rotate-90')

    await userEvent.click(group)
    expect(onToggleGroup).toHaveBeenLastCalledWith('Contribuyentes')
    await userEvent.click(within(nav()).getByRole('button', { name: 'Impuesto predial' }))
    expect(onToggleGroup).toHaveBeenLastCalledWith('Tributos/Impuesto predial')
    within(nav()).getByRole('button', { name: 'Tributos' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(onToggleGroup).toHaveBeenLastCalledWith('Tributos')
  })

  it('marks the current leaf, in bold and with a chevron', () => {
    draw({}, { route: '/contribuyentes/123' })
    expect(current()).toEqual(['Buscar contribuyentes'])
    const leaf = within(nav()).getByRole('link', { name: 'Buscar contribuyentes' })
    expect(leaf).toHaveClass('border-link', 'font-bold')
    expect(leaf.querySelector('svg')).not.toBeNull()
    const other = within(nav()).getByRole('link', { name: 'Arbitrios' })
    expect(other).toHaveClass('border-transparent')
    expect(other.querySelector('svg')).toBeNull()
  })

  it('draws an external leaf at the root like a group, with its icon, never current', async () => {
    const { onNavigate } = draw({}, { route: '/admin' })
    const admin = within(nav()).getByRole('link', { name: 'Administración' })
    expect(admin).toHaveAttribute('href', '/admin')
    expect(admin).toHaveAttribute('data-slot', 'nav-tree-group')
    expect(admin.querySelector('[data-slot="nav-tree-caret"] svg')).not.toBeNull()
    expect(current()).toEqual([])
    // another app loads in full: the panel has nothing to fold
    await userEvent.click(admin)
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('tells its caller of a pick and of a fold', async () => {
    const { onNavigate, onFold } = draw()
    await userEvent.click(within(nav()).getByRole('link', { name: 'Arbitrios' }))
    expect(onNavigate).toHaveBeenCalledTimes(1)
    await userEvent.click(within(nav()).getByRole('link', { name: 'Ir al inicio' }))
    expect(onNavigate).toHaveBeenCalledTimes(2)
    await userEvent.click(within(nav()).getByRole('button', { name: 'Ocultar el menú' }))
    expect(onFold).toHaveBeenCalledTimes(1)
  })

  it('is hidden while folded', () => {
    const { container } = draw({ open: false })
    expect(screen.queryByRole('navigation', { name: 'Secciones' })).not.toBeInTheDocument()
    expect(container.querySelector('[data-slot="nav-tree"]')).toHaveAttribute('hidden')
  })

  it('speaks English when the app does', () => {
    draw({}, { language: 'en' })
    expect(within(nav()).getByRole('link', { name: 'Go to the home page' })).toBeInTheDocument()
    expect(within(nav()).getByRole('button', { name: 'Hide the menu' })).toBeInTheDocument()
  })
})
