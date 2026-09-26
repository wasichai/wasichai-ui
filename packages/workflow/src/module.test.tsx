import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { workflowModule } from './module'

describe('workflowModule', () => {
  it('registers next to core without a conflict', () => {
    expect(() => createRegistry([coreModule, workflowModule()])).not.toThrow()
  })

  it('mounts its builder under the default base path', () => {
    const links = createLinks(createRegistry([coreModule, workflowModule()]))
    expect(links.to('workflow:builder')).toBe('/automation/workflows')
  })

  it('moves every route when the app picks another base path', () => {
    const links = createLinks(createRegistry([coreModule, workflowModule({ basePath: 'x' })]))
    expect(links.to('workflow:builder')).toBe('/x/workflows')
  })

  it('puts the builder in core automation group', () => {
    const registry = createRegistry([coreModule, workflowModule()])
    const automation = registry.navGroups.find((group) => group.id === 'automation')
    expect(automation?.items.map((item) => [item.labelKey, item.to])).toEqual([['workflow:nav.workflows', '/automation/workflows']])
  })

  it('offers the page builder a WORKFLOW component and a TRANSITION action', () => {
    const registry = createRegistry([coreModule, workflowModule()])
    expect(registry.pageComponents.WORKFLOW).toMatchObject({ labelKey: 'workflow:pageComponents.WORKFLOW' })
    expect(registry.pageComponents.WORKFLOW.icon).toBeDefined()
    expect(registry.pageComponents.WORKFLOW.preview).toBeDefined()
    expect(registry.pageActions.TRANSITION).toMatchObject({ labelKey: 'workflow:pageActions.TRANSITION', defaults: { action: 'TRANSITION' } })
    expect(registry.pageActions.TRANSITION.settings).toBeDefined()
    expect(registry.objectFlags).toHaveLength(1)
  })
})
