import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { coreModule } from '../app/coreModule'
import type { WasichaiModule } from '../registry/contract'
import { AppShell } from './AppShell'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

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
    // the language button now goes through useSetLocale, which reads preferences: 404 keeps it browser-only
    fetch = mockFetch([])
    renderWithProviders(<AppShell />, { modules: [coreModule] })

    await userEvent.click(screen.getByRole('button', { name: 'EN' }))

    expect(await screen.findByRole('button', { name: 'ES' })).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(localStorage.getItem('wasichai-test.lang')).toBe('en')
  })

  it('has no language toggle in a one-language app', () => {
    renderWithProviders(<AppShell />, { modules: [coreModule], config: { languages: ['es'] } })
    expect(screen.queryByRole('button', { name: 'EN' })).not.toBeInTheDocument()
  })

  it('lets the user pick a theme', async () => {
    // 404 on the GET: preferences stay browser-only, so the pick can't race a PUT
    fetch = mockFetch([])
    renderWithProviders(<AppShell />, { modules: [coreModule], language: 'en' })
    const select = screen.getByRole('combobox', { name: 'Theme' })
    expect(screen.getByRole('option', { name: 'System' })).toBeInTheDocument()
    await userEvent.selectOptions(select, 'dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('wasichai-test.theme')).toBe('dark')
  })

  it('shows why a theme could not be saved', async () => {
    fetch = mockFetch([
      { path: '/auth/me/preferences', body: { theme: 'system', locale: null } },
      { method: 'PUT', path: '/auth/me/preferences', status: 500, body: { title: 'Internal Server Error', detail: 'boom' } }
    ])
    renderWithProviders(<AppShell />, { modules: [coreModule], language: 'en' })
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Theme' }), 'dark')
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('names the app from config, or from the strings when config says nothing', () => {
    const { unmount } = renderWithProviders(<AppShell />, { modules: [coreModule], config: { appName: 'Catastro' } })
    expect(screen.getByText('Catastro')).toBeInTheDocument()
    unmount()
    renderWithProviders(<AppShell />, { modules: [coreModule] })
    expect(screen.getByText('Wasichai')).toBeInTheDocument()
  })
})
