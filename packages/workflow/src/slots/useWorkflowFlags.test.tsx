import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { coreModule, useObjectFlags } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { workflowModule } from '../module'

function Probe() {
  return <output>{JSON.stringify(useObjectFlags('predio'))}</output>
}

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

describe('workflow object flag', () => {
  it('tells core an object has a workflow', async () => {
    fetch = mockFetch([
      {
        path: '/objects/predio/workflow',
        body: { id: 'wf-1', objectName: 'predio', name: 'a', label: 'A', enabled: true, definition: { states: [], transitions: [] } }
      }
    ])
    // core declares the 'automation' nav group workflowModule's nav item points at; createRegistry
    // validates that eagerly, so it must be in the array even though this test never draws the sidebar
    renderWithProviders(<Probe />, { modules: [coreModule, workflowModule()] })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('{"workflow":true}'))
  })

  it('says no for an object whose workflow answers 404', async () => {
    fetch = mockFetch([])
    renderWithProviders(<Probe />, { modules: [coreModule, workflowModule()] })
    // ThemeProvider's own preferences GET also lands in fetch.calls; only count the workflow one
    await waitFor(() => expect(fetch?.calls.filter((call) => call.path !== '/auth/me/preferences')).toHaveLength(1))
    expect(screen.getByRole('status')).toHaveTextContent('{"workflow":false}')
  })
})
