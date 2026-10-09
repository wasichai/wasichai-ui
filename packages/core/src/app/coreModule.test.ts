import { describe, expect, it } from 'vitest'
import type { CallerPermissions } from '../types/auth'
import { coreModule } from './coreModule'

const entry = coreModule.nav?.find((item) => item.labelKey === 'nav.serviceAccounts')
const visible = (permissions: CallerPermissions | null) => entry?.visible?.(permissions) ?? true

describe('core nav', () => {
  it('points service accounts at its route under administration', () => {
    expect(entry).toMatchObject({ group: 'administration', route: 'serviceAccounts', order: 25 })
    expect(coreModule.routes?.find((route) => route.id === 'serviceAccounts')?.path).toBe('admin/service-accounts')
  })

  it('shows service accounts to whoever may manage the organization', () => {
    expect(visible({ admin: true, objects: {} })).toBe(true)
    expect(visible({ admin: false, objects: {}, capabilities: ['MANAGE_ORGANIZATION'] })).toBe(true)
  })

  // an older server sends no capabilities: the entry shows and its 403 decides
  it('shows service accounts when the server does not say', () => {
    expect(visible({ admin: false, objects: {} })).toBe(true)
  })

  it('hides service accounts from the rest', () => {
    expect(visible({ admin: false, objects: {}, capabilities: [] })).toBe(false)
    expect(visible({ admin: false, objects: {}, capabilities: ['MANAGE_METADATA'] })).toBe(false)
    expect(visible(null)).toBe(false)
  })
})
