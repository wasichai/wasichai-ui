import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ActionButton, coreModule, type PageComponent } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { workflowModule } from '../module'

function action(extra: Partial<PageComponent>): PageComponent {
  return { type: 'ACTION', column: 1, title: null, layout: 'single-column', children: [], relationship: null, fields: null, content: null, ...extra }
}

const TRANSITIONS = '/objects/predio/records/r1/transitions'
const closed = [{ name: 'aprobar', label: 'Aprobar', to: 'approved', toLabel: 'Aprobado', allowed: false, reason: 'No es tu rol' }]
const open = [{ ...closed[0], allowed: true, reason: null }]

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

// core declares the 'automation' nav group workflowModule's nav item points at; createRegistry
// validates that eagerly, so it must be in the array even though this test never draws the sidebar
function draw(component: PageComponent) {
  return renderWithProviders(<ActionButton component={component} objectName="predio" recordId="r1" />, { modules: [coreModule, workflowModule()] })
}

describe('TRANSITION action', () => {
  it('says why a transition is closed instead of pretending it is open', async () => {
    fetch = mockFetch([{ path: TRANSITIONS, body: closed }])
    draw(action({ action: 'TRANSITION', transition: 'aprobar', title: 'Aprobar' }))

    const button = await screen.findByTitle('No es tu rol')
    expect(button).toHaveAccessibleName('Aprobar')
    expect(button).toBeDisabled()
  })

  it('applies the transition the button names', async () => {
    fetch = mockFetch([
      { path: TRANSITIONS, body: open },
      { method: 'POST', path: `${TRANSITIONS}/aprobar`, body: { id: 'r1', createdAt: null, updatedAt: null, attributes: {}, state: 'approved' } }
    ])
    draw(action({ action: 'TRANSITION', transition: 'aprobar', style: 'PRIMARY' }))

    const button = await screen.findByRole('button', { name: 'Aprobar' })
    await waitFor(() => expect(button).toBeEnabled())
    await userEvent.click(button)

    await waitFor(() => expect(fetch?.calls.some((call) => call.method === 'POST' && call.path === `${TRANSITIONS}/aprobar`)).toBe(true))
  })

  it('says so when the transition left the workflow, and falls back to its technical name', async () => {
    fetch = mockFetch([{ path: TRANSITIONS, body: [] }])
    draw(action({ action: 'TRANSITION', transition: 'archivar' }))

    const button = await screen.findByRole('button', { name: 'archivar' })
    expect(button).toHaveAttribute('title', 'Esta transición ya no existe en el workflow')
    expect(button).toBeDisabled()
  })
})
