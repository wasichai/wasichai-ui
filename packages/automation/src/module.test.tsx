import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { automationModule } from './module'

describe('automationModule', () => {
  it('registers next to core without a conflict', () => {
    expect(() => createRegistry([coreModule, automationModule()])).not.toThrow()
  })

  it('mounts its routes under the default base path', () => {
    const links = createLinks(createRegistry([coreModule, automationModule()]))
    expect(links.to('automation:rules')).toBe('/automation/rules')
    expect(links.to('automation:runs')).toBe('/automation/runs')
  })

  it('moves every route when the app picks another base path', () => {
    const links = createLinks(createRegistry([coreModule, automationModule({ basePath: 'x' })]))
    expect(links.to('automation:rules')).toBe('/x/rules')
    expect(links.to('automation:runs')).toBe('/x/runs')
  })

  it('puts rules and runs in core automation group, after workflows', () => {
    const registry = createRegistry([coreModule, automationModule()])
    const group = registry.navGroups.find((candidate) => candidate.id === 'automation')
    expect(group?.items.map((item) => [item.labelKey, item.to, item.order])).toEqual([
      ['automation:nav.rules', '/automation/rules', 20],
      ['automation:nav.runs', '/automation/runs', 30]
    ])
  })
})
