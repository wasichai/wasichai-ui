import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { agentModule } from './module'

describe('agentModule', () => {
  it('registers next to core without a conflict', () => {
    expect(() => createRegistry([coreModule, agentModule()])).not.toThrow()
  })

  it('mounts its route under the default base path', () => {
    const links = createLinks(createRegistry([coreModule, agentModule()]))
    expect(links.to('agent:assistant')).toBe('/automation/assistant')
  })

  it('moves every route when the app picks another base path', () => {
    const links = createLinks(createRegistry([coreModule, agentModule({ basePath: 'x' })]))
    expect(links.to('agent:assistant')).toBe('/x/assistant')
  })

  it('puts its entry last in core automation group', () => {
    const automation = createRegistry([coreModule, agentModule()]).navGroups.find((group) => group.id === 'automation')
    expect(automation?.items).toEqual([expect.objectContaining({ labelKey: 'agent:nav.assistant', to: '/automation/assistant', order: 40 })])
  })
})
