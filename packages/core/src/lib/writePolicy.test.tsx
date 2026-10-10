import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import type { ObjectDefinition } from '../types/metadata'
import { useWritePolicy, writePolicy } from './writePolicy'

let fetch: FetchMock | null = null
afterEach(() => fetch?.restore())

const definition = (name: string, rules: Partial<ObjectDefinition> = {}): ObjectDefinition => ({
  id: `o-${name}`,
  name,
  label: name,
  pluralLabel: name,
  description: null,
  enabled: true,
  fields: [],
  ...rules
})

function Probe({ objectName, other }: { objectName: string; other?: string }) {
  return <pre data-testid="policy">{JSON.stringify(useWritePolicy(objectName, other))}</pre>
}

const shown = () => JSON.parse(screen.getByTestId('policy').textContent ?? '{}') as Record<string, boolean>

describe('writePolicy', () => {
  it('offers every write when no rule is set', () =>
    expect(writePolicy({})).toEqual({
      loaded: true,
      appendOnly: false,
      apiOnly: false,
      requiresReason: false,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canLink: true,
      canTransition: true
    }))

  it('append-only: create only, no transition', () =>
    expect(writePolicy({ appendOnly: true })).toMatchObject({ canCreate: true, canUpdate: false, canDelete: false, canLink: false, canTransition: false }))

  it('api-only: nothing through the generic api, transitions allowed', () =>
    expect(writePolicy({ apiOnly: true })).toMatchObject({ canCreate: false, canUpdate: false, canDelete: false, canLink: false, canTransition: true }))

  it('a link takes the rules of both ends', () =>
    expect(writePolicy({ requiresReason: true }, { appendOnly: true })).toMatchObject({ requiresReason: true, appendOnly: true, canLink: false }))

  it('is not loaded until every object arrived', () => {
    expect(writePolicy({}, undefined).loaded).toBe(false)
    expect(writePolicy(null).loaded).toBe(false)
  })
})

describe('useWritePolicy', () => {
  it('waits for the definition before it counts as loaded', async () => {
    fetch = mockFetch([{ path: '/metadata/objects/predio', body: definition('predio', { requiresReason: true }) }])
    renderWithProviders(<Probe objectName="predio" />)

    // a write offered now would skip the reason prompt
    expect(shown().loaded).toBe(false)
    await screen.findByText(/"loaded":true/)
    expect(shown()).toMatchObject({ loaded: true, requiresReason: true, canUpdate: true })
  })

  it('counts a failed definition read as loaded, with no rules', async () => {
    fetch = mockFetch([{ path: '/metadata/objects/predio', status: 403, body: { title: 'Forbidden' } }])
    renderWithProviders(<Probe objectName="predio" />)

    // the server still refuses what it must: the buttons are not disabled forever
    await screen.findByText(/"loaded":true/)
    expect(shown()).toMatchObject({ loaded: true, requiresReason: false, canUpdate: true })
  })

  it('reads the second end of a link', async () => {
    fetch = mockFetch([
      { path: '/metadata/objects/predio', body: definition('predio') },
      { path: '/metadata/objects/titular', body: definition('titular', { apiOnly: true }) }
    ])
    renderWithProviders(<Probe objectName="predio" other="titular" />)

    await screen.findByText(/"loaded":true/)
    expect(shown()).toMatchObject({ apiOnly: true, canLink: false })
  })

  it('waits for the second end too', async () => {
    fetch = mockFetch([{ path: '/metadata/objects/predio', body: definition('predio') }])
    renderWithProviders(<Probe objectName="predio" other="titular" />)

    // titular answers 404 (no route): an error, so it settles as loaded with no rules
    await screen.findByText(/"loaded":true/)
    expect(fetch.calls.map((call) => call.path)).toContain('/metadata/objects/titular')
    expect(shown()).toMatchObject({ canLink: true })
  })
})
