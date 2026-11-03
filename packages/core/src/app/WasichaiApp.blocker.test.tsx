import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Link, useBlocker, useNavigate } from 'react-router'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import type { WasichaiModule } from '../registry/contract'
import { WasichaiApp } from './WasichaiApp'

// a page with work written half way: it holds every way out until the user says (#128)
function Grading() {
  const blocker = useBlocker(true)
  const navigate = useNavigate()
  return (
    <div>
      <p>corrección a medias</p>
      <button type="button" onClick={() => void navigate('/learning/other')}>
        ir por código
      </button>
      {blocker.state === 'blocked' ? (
        <div role="alertdialog" aria-label="¿Salir sin guardar?">
          <button type="button" onClick={() => blocker.proceed()}>
            salir
          </button>
          <button type="button" onClick={() => blocker.reset()}>
            quedarme
          </button>
        </div>
      ) : null}
    </div>
  )
}
const Other = () => (
  <>
    <p>otra pantalla</p>
    <Link to="/learning/grading">corregir</Link>
  </>
)

const learning: WasichaiModule = {
  id: 'learning',
  basePath: 'learning',
  routes: [
    { id: 'grading', path: 'grading', component: Grading },
    { id: 'other', path: 'other', component: Other }
  ],
  navGroups: [{ id: 'learning', labelKey: 'learning:nav.group', order: 5 }],
  nav: [{ group: 'learning', labelKey: 'learning:nav.other', order: 10, route: 'other' }],
  i18n: { es: { nav: { group: 'Aprender', other: 'Otra' } }, en: { nav: { group: 'Learn', other: 'Other' } } }
}

const ana = { id: 'u1', email: 'ana@wasichai.test', displayName: 'Ana', organizationId: 'o1', roles: ['ADMIN'] }

let fetch: FetchMock | null = null
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('blocker.user', JSON.stringify(ana))
  localStorage.setItem('blocker.token', 't')
  fetch = mockFetch([
    { path: '/auth/me/permissions', body: { admin: true, objects: {} } },
    { path: '/objects', body: [] }
  ])
})
afterEach(() => fetch?.restore())

async function openGrading(basename?: string) {
  window.history.pushState({}, '', `${basename ?? ''}/`)
  window.history.pushState({}, '', `${basename ?? ''}/learning/grading`)
  render(<WasichaiApp config={{ storagePrefix: 'blocker', basename }} modules={[learning]} />)
  expect(await screen.findByText('corrección a medias')).toBeInTheDocument()
}

const dialog = () => screen.findByRole('alertdialog', { name: '¿Salir sin guardar?' })

describe('useBlocker under WasichaiApp (#128)', () => {
  it('holds a shell link until proceed, and stays on reset', async () => {
    await openGrading()

    await userEvent.click(screen.getByRole('link', { name: 'Otra' }))
    await userEvent.click(within(await dialog()).getByRole('button', { name: 'quedarme' }))
    expect(screen.getByText('corrección a medias')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/learning/grading')

    await userEvent.click(screen.getByRole('link', { name: 'Otra' }))
    await userEvent.click(within(await dialog()).getByRole('button', { name: 'salir' }))
    expect(await screen.findByText('otra pantalla')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/learning/other')
  })

  it('holds navigate() from the page', async () => {
    await openGrading()
    await userEvent.click(screen.getByRole('button', { name: 'ir por código' }))
    await dialog()
    expect(window.location.pathname).toBe('/learning/grading')
  })

  // back and forward go between entries the router made: one it did not make it cannot measure, so it lets it pass
  it('holds the browser back and forward buttons, and keeps the url on reset', async () => {
    window.history.pushState({}, '', '/learning/other')
    render(<WasichaiApp config={{ storagePrefix: 'blocker' }} modules={[learning]} />)
    await userEvent.click(await screen.findByRole('link', { name: 'corregir' }))
    expect(await screen.findByText('corrección a medias')).toBeInTheDocument()

    await act(async () => window.history.back())
    await userEvent.click(within(await dialog()).getByRole('button', { name: 'quedarme' }))
    expect(screen.getByText('corrección a medias')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/learning/grading')

    await act(async () => window.history.back())
    await userEvent.click(within(await dialog()).getByRole('button', { name: 'salir' }))
    expect(await screen.findByText('otra pantalla')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/learning/other')

    await act(async () => window.history.forward())
    expect(await screen.findByText('corrección a medias')).toBeInTheDocument()
  })

  it('keeps the url on reset after back', async () => {
    window.history.pushState({}, '', '/learning/other')
    render(<WasichaiApp config={{ storagePrefix: 'blocker' }} modules={[learning]} />)
    await userEvent.click(await screen.findByRole('link', { name: 'corregir' }))
    await screen.findByText('corrección a medias')
    await act(async () => window.history.back())
    await userEvent.click(within(await dialog()).getByRole('button', { name: 'quedarme' }))
    expect(screen.getByText('corrección a medias')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/learning/grading')
  })

  it('works under a basename', async () => {
    await openGrading('/campus')
    await userEvent.click(screen.getByRole('link', { name: 'Otra' }))
    await userEvent.click(within(await dialog()).getByRole('button', { name: 'salir' }))
    expect(await screen.findByText('otra pantalla')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/campus/learning/other')
  })
})
