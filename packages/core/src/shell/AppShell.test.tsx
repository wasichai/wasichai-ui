import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { coreModule } from '../app/coreModule'
import type { WasichaiModule } from '../registry/contract'
import { AppShell } from './AppShell'

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

  it('shows a placeholder entry as disabled text, not as a link', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule] })
    expect(screen.getByText('Registros')).toHaveAttribute('title', 'Registros')
    expect(screen.queryByRole('link', { name: 'Registros' })).not.toBeInTheDocument()
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

  it('shows why a theme could not be saved', async () => {
    fetch = mockFetch([
      { path: '/auth/me/preferences', body: { theme: 'system', locale: null } },
      { method: 'PUT', path: '/auth/me/preferences', status: 500, body: { title: 'Internal Server Error', detail: 'boom' } }
    ])
    renderWithProviders(<AppShell />, { modules: [coreModule], language: 'en' })
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Theme' }), 'dark')
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
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
