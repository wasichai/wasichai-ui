import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { coreModule } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { RunTable } from './RunTable'
import { automationModule } from './module'
import type { AutomationRun } from './types'

const run = (overrides: Partial<AutomationRun>): AutomationRun => ({
  id: 'run-1',
  automation: 'marca-revisado',
  objectName: 'predio',
  recordId: 'rec-1',
  trigger: 'RECORD_CREATED',
  status: 'SUCCEEDED',
  depth: 0,
  steps: [],
  error: null,
  attempts: 1,
  createdAt: '2026-09-18T10:00:00Z',
  finishedAt: '2026-09-18T10:00:01Z',
  ...overrides
})

// the log exists to answer two questions, so both have to be readable on screen
describe('RunTable', () => {
  it('says what a successful run did', () => {
    renderWithProviders(<RunTable runs={[run({ steps: [{ action: 'UPDATE_FIELD', detail: 'predio.revisado = si' }] })]} />, {
      modules: [coreModule, automationModule()]
    })
    expect(screen.getByText(/predio\.revisado = si/)).toBeInTheDocument()
  })

  it('says why a run was skipped, in the same place a failure would be', () => {
    renderWithProviders(<RunTable runs={[run({ status: 'SKIPPED', error: 'condition not met: area GREATER_THAN 1000' })]} />, {
      modules: [coreModule, automationModule()]
    })
    expect(screen.getByText(/condition not met: area GREATER_THAN 1000/)).toBeInTheDocument()
  })

  it('shows the chain depth only when the run was caused by another automation', () => {
    const { rerender } = renderWithProviders(<RunTable runs={[run({})]} />, { modules: [coreModule, automationModule()] })
    expect(screen.queryByText(/^Profundidad|^Depth/)).not.toBeInTheDocument()
    rerender(<RunTable runs={[run({ depth: 2 })]} />)
    expect(screen.getByText(/2$/)).toBeInTheDocument()
  })

  it('has an empty state instead of an empty table', () => {
    renderWithProviders(<RunTable runs={[]} />, { modules: [coreModule, automationModule()] })
    expect(screen.getByText(/todavía no se ha disparado|it has not fired yet/i)).toBeInTheDocument()
  })
})
