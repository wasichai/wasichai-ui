import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { coreModule } from '../app/coreModule'
import type { WasichaiModule } from '../registry/contract'
import { AppShell } from './AppShell'
import type { ShellNav } from '../app/config'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

// lets every mocked request answer, so a rollback would already show
const waitForSettled = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

const Sheets = () => <p>hojas</p>
const plans: WasichaiModule = {
  id: 'plans',
  basePath: 'plans',
  routes: [{ id: 'sheets', path: 'sheets', component: Sheets }],
  navGroups: [{ id: 'plans', labelKey: 'plans:nav.group', order: 20 }],
  nav: [
    { group: 'plans', labelKey: 'plans:nav.sheets', order: 10, route: 'sheets' },
    { group: 'plans', labelKey: 'plans:nav.secret', order: 20, route: 'sheets', visible: (permissions) => permissions?.admin === true }
  ],
  i18n: { es: { nav: { group: 'Planos', sheets: 'Hojas', secret: 'Secreto' } }, en: { nav: { group: 'Plans', sheets: 'Sheets', secret: 'Secret' } } }
}

describe('AppShell', () => {
  it('builds the sidebar from the registered modules, in group order', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans] })

    const headings = screen.getAllByText(/^(Datos|Planos)$/).map((node) => node.textContent)
    expect(headings).toEqual(['Datos', 'Planos'])
    expect(screen.getByRole('link', { name: 'Hojas' })).toHaveAttribute('href', '/plans/sheets')
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
  })

  it('shows a placeholder entry as a disabled link with no destination (#131)', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule] })
    const records = screen.getByRole('link', { name: 'Registros' })
    expect(records).toHaveAttribute('title', 'Registros')
    expect(records).toHaveAttribute('aria-disabled', 'true')
    expect(records).toHaveAttribute('data-slot', 'nav-item')
    expect(records).not.toHaveAttribute('href')
  })

  it('leaves out a group nobody put anything in', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule] })
    expect(screen.queryByText('Automatización')).not.toBeInTheDocument()
  })

  it('hides an entry the caller may not use', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans], permissions: { admin: false, objects: {} } })
    expect(screen.queryByText('Secreto')).not.toBeInTheDocument()
    expect(screen.getByText('Hojas')).toBeInTheDocument()
  })

  it('offers the next configured language and remembers the choice', async () => {
    // backend without preferences: the GET and any PUT answer 404, and both keep the choice browser-only,
    // so it does not matter whether the click lands before the GET settles
    fetch = mockFetch([])
    renderWithProviders(<AppShell />, { modules: [coreModule] })

    await userEvent.click(screen.getByRole('button', { name: 'EN' }))

    expect(await screen.findByRole('button', { name: 'ES' })).toBeInTheDocument()
    await waitForSettled()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(localStorage.getItem('wasichai-test.lang')).toBe('en')
    expect(screen.queryByText(/no mock for/)).not.toBeInTheDocument()
  })

  it('has no language toggle in a one-language app', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule], config: { languages: ['es'] } })
    expect(screen.queryByRole('button', { name: 'EN' })).not.toBeInTheDocument()
  })

  it('lets the user pick a theme', async () => {
    // backend without preferences: a 404 on the GET or on a racing PUT keeps the pick browser-only
    fetch = mockFetch([])
    renderWithProviders(<AppShell />, { modules: [coreModule], language: 'en' })
    const select = screen.getByRole('combobox', { name: 'Theme' })
    expect(screen.getByRole('option', { name: 'System' })).toBeInTheDocument()
    await userEvent.selectOptions(select, 'dark')
    await waitForSettled()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('wasichai-test.theme')).toBe('dark')
    expect(screen.queryByText(/no mock for/)).not.toBeInTheDocument()
  })

  it('names an app theme by its text per language, without any module i18n (#115)', async () => {
    fetch = mockFetch([])
    const quipu = { id: 'quipu-dark', label: { es: 'Quipu oscuro', en: 'Quipu dark' }, colorScheme: 'dark' as const }
    renderWithProviders(<AppShell />, { modules: [coreModule], config: { themes: [quipu] } })
    expect(screen.getByRole('option', { name: 'Quipu oscuro' })).toHaveValue('quipu-dark')

    await userEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(await screen.findByRole('option', { name: 'Quipu dark' })).toBeInTheDocument()
    await waitForSettled()
  })

  it('carries data-slot hooks on the menu and the theme select for a theme sheet (#116)', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans] })
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('data-slot', 'nav-item')
    const sheets = screen.getByRole('link', { name: 'Hojas' })
    expect(sheets).toHaveAttribute('data-slot', 'nav-item')
    expect(screen.getByText('Planos')).toHaveAttribute('data-slot', 'nav-group')
    expect(screen.getByRole('combobox', { name: 'Tema' })).toHaveAttribute('data-slot', 'theme-select')
  })

  it('keeps aria-current on the current menu item', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans], route: '/plans/sheets' })
    expect(screen.getByRole('link', { name: 'Hojas' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current')
  })

  it('shows why a theme could not be saved', async () => {
    fetch = mockFetch([
      { path: '/auth/me/preferences', body: { theme: 'system', locale: null } },
      { method: 'PUT', path: '/auth/me/preferences', status: 500, body: { title: 'Internal Server Error', detail: 'boom' } }
    ])
    renderWithProviders(<AppShell />, { modules: [coreModule], language: 'en' })
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Theme' }), 'dark')
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })

  it('draws the app logo before the name in the sidebar, hidden from screen readers (#126)', () => {
    const before = document.title
    renderWithProviders(<AppShell />, { modules: [coreModule], config: { appName: 'Quipu', appLogo: <svg data-testid="logo" /> } })
    const aside = document.querySelector('aside')!
    const logo = within(aside).getByTestId('logo').closest('[data-slot="app-logo"]')!
    expect(logo).toHaveAttribute('aria-hidden', 'true')
    expect(logo.nextElementSibling).toHaveTextContent('Quipu')
    // the narrow menu bar stays without a brand
    expect(within(document.querySelector('header')!).queryByTestId('logo')).toBeNull()
    expect(document.title).toBe(before)
  })

  it('draws no logo wrapper without appLogo (#126)', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule] })
    expect(document.querySelector('[data-slot="app-logo"]')).toBeNull()
  })

  it('starts the tab order with a skip link that takes focus to the main content (#132)', async () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans] })
    await userEvent.tab()
    const skip = screen.getByRole('link', { name: 'Saltar al contenido' })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('data-slot', 'skip-link')
    // hidden until focused
    expect(skip).toHaveClass('sr-only', 'focus:not-sr-only')
    await userEvent.keyboard('{Enter}')
    expect(document.querySelector('main')).toHaveFocus()
    expect(skip.getAttribute('href')).toBe(`#${document.querySelector('main')!.id}`)
  })

  it('names the skip link in english too (#132)', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule], language: 'en' })
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument()
  })

  it('names the app from config, or from the strings when config says nothing', () => {
    const { unmount } = renderWithProviders(<AppShell />, { modules: [coreModule], config: { appName: 'Catastro' } })
    expect(screen.getByText('Catastro')).toBeInTheDocument()
    unmount()
    renderWithProviders(<AppShell />, { modules: [coreModule] })
    expect(screen.getByText('Wasichai')).toBeInTheDocument()
  })
})

// jsdom applies no css: the narrow drawer is read from its state (aria, classes), the breakpoint from the md: classes
describe('AppShell on a narrow screen', () => {
  const menuButton = () => screen.getByRole('button', { name: 'Abrir el menú' })
  const drawer = () => document.getElementById(menuButton().getAttribute('aria-controls') ?? '')!

  it('starts with the drawer closed', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans] })
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    expect(drawer().tagName).toBe('ASIDE')
    expect(drawer()).toHaveClass('-translate-x-full', 'invisible')
    expect(screen.queryByTestId('shell-backdrop')).not.toBeInTheDocument()
  })

  it('opens with the menu button and puts focus in the drawer', async () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans] })
    await userEvent.click(menuButton())
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true')
    expect(drawer()).toHaveClass('translate-x-0')
    expect(drawer()).not.toHaveClass('invisible')
    expect(drawer()).toContainElement(document.activeElement as HTMLElement)
    expect(screen.getByTestId('shell-backdrop')).toBeInTheDocument()
  })

  it('is a named modal dialog while open, and a plain aside when closed (#133)', async () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans] })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(drawer()).not.toHaveAttribute('aria-modal')

    await userEvent.click(menuButton())
    const dialog = screen.getByRole('dialog', { name: 'Menú' })
    expect(dialog).toBe(drawer())
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toContainElement(document.activeElement as HTMLElement)

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(menuButton()).toHaveFocus()
  })

  it('names the open drawer in english too (#133)', async () => {
    renderWithProviders(<AppShell />, { modules: [coreModule], language: 'en' })
    await userEvent.click(screen.getByRole('button', { name: 'Open the menu' }))
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument()
  })

  it('closes with Escape and gives focus back to the menu button', async () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans] })
    await userEvent.click(menuButton())
    await userEvent.keyboard('{Escape}')
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton()).toHaveFocus()
  })

  it('closes with a click on the backdrop and with its own close button', async () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans] })
    await userEvent.click(menuButton())
    await userEvent.click(screen.getByTestId('shell-backdrop'))
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(menuButton())
    await userEvent.click(within(drawer()).getByRole('button', { name: 'Cerrar el menú' }))
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton()).toHaveFocus()
  })

  it('carries data-slot on its close button, for a theme sheet (#122)', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule] })
    expect(within(drawer()).getByRole('button', { name: 'Cerrar el menú' })).toHaveAttribute('data-slot', 'nav-close')
  })

  it('closes when the user navigates', async () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans] })
    await userEvent.click(menuButton())
    await userEvent.click(within(drawer()).getByRole('link', { name: 'Hojas' }))
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    expect(drawer()).toHaveClass('invisible')
  })

  it('names the menu button in english too', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule], language: 'en' })
    expect(screen.getByRole('button', { name: 'Open the menu' })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('AppShell on a wide screen', () => {
  it('keeps the sidebar static and open beside main, and hides the menu bar', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule] })
    const aside = document.querySelector('aside')!
    expect(aside).toHaveClass('w-60', 'shrink-0', 'md:static', 'md:translate-x-0', 'md:visible')
    expect(aside.parentElement).toHaveClass('md:flex-row')
    expect(aside.nextElementSibling?.tagName).toBe('MAIN')
    expect(screen.getByRole('button', { name: 'Abrir el menú' }).closest('header')).toHaveClass('md:hidden')
    expect(within(aside).getByRole('button', { name: 'Cerrar el menú' })).toHaveClass('md:hidden')
  })
})

describe('AppShell shellNav', () => {
  it('without shellNav, offers every group as before', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule, plans] })
    const headings = screen.getAllByText(/^(Datos|Planos|Administración)$/).map((node) => node.textContent)
    expect(headings).toEqual(['Datos', 'Planos', 'Administración'])
  })

  it('draws only the groups shellNav returns, with the route and the permissions', () => {
    const permissions = { admin: false, objects: {} }
    const shellNav = vi.fn<ShellNav>((groups) => groups.filter((group) => group.id === 'plans'))
    renderWithProviders(<AppShell />, { modules: [coreModule, plans], permissions, route: '/plans/sheets', config: { shellNav } })

    expect(screen.queryByText('Datos')).not.toBeInTheDocument()
    expect(screen.queryByText('Administración')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Hojas' })).toBeInTheDocument()
    // Inicio stays: the way back
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(shellNav).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'data' })]), { pathname: '/plans/sheets', permissions })
  })

  it('passes null permissions while they load', () => {
    const shellNav = vi.fn<ShellNav>((groups) => groups)
    renderWithProviders(<AppShell />, { modules: [coreModule], permissions: null, config: { shellNav } })
    expect(shellNav).toHaveBeenCalledWith(expect.any(Array), { pathname: '/', permissions: null })
  })

  it('still applies visible to what it returns, and drops a group left empty', () => {
    const only =
      (id: string): ShellNav =>
      (groups) =>
        groups.filter((group) => group.id === id)
    const { unmount } = renderWithProviders(<AppShell />, {
      modules: [coreModule, plans],
      permissions: { admin: false, objects: {} },
      config: { shellNav: only('plans') }
    })
    expect(screen.getByText('Hojas')).toBeInTheDocument()
    expect(screen.queryByText('Secreto')).not.toBeInTheDocument()
    unmount()

    // a group shellNav makes up out of hidden entries is still a heading over nothing
    const hiddenOnly: ShellNav = (groups) =>
      groups.filter((group) => group.id === 'plans').map((group) => ({ ...group, items: group.items.filter((item) => item.visible) }))
    renderWithProviders(<AppShell />, { modules: [coreModule, plans], permissions: { admin: false, objects: {} }, config: { shellNav: hiddenOnly } })
    expect(screen.queryByText('Planos')).not.toBeInTheDocument()
  })

  it('asks again when the route changes', async () => {
    // a section menu: the plans group only outside plans
    const shellNav: ShellNav = (groups, { pathname }) => (pathname.startsWith('/plans') ? groups.filter((group) => group.id !== 'plans') : groups)
    renderWithProviders(<AppShell />, { modules: [coreModule, plans], config: { shellNav } })

    await userEvent.click(screen.getByRole('link', { name: 'Hojas' }))
    expect(screen.queryByText('Planos')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(screen.getByText('Planos')).toBeInTheDocument()
  })

  it('only decides the menu: routes and links stay', () => {
    const shellNav: ShellNav = () => []
    renderWithProviders(<AppShell />, { modules: [coreModule, plans], config: { shellNav } })
    expect(screen.queryByText('Datos')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/')
  })
})
