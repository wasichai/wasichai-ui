import { describe, expect, it } from 'vitest'
import type { Node } from './pageTree'
import { currentTab, hoverTarget, parseTabHandle, tabHandleId } from './openTabs'

function tab(uid: string): Node {
  return { uid, type: 'TAB', column: 1, title: null, layout: 'single-column', children: [], relationship: null, fields: null, content: null }
}

describe('tab handle ids', () => {
  it('survives a round trip', () => {
    expect(parseTabHandle(tabHandleId('strip', 'first'))).toEqual({ strip: 'strip', tab: 'first' })
  })

  it('reads nothing out of the ids the canvas already uses', () => {
    expect(parseTabHandle('slot:0.1.0:1')).toBeNull()
    expect(parseTabHandle('node:abc')).toBeNull()
    expect(parseTabHandle('palette:FORM')).toBeNull()
  })

  it('refuses a handle missing a half', () => {
    expect(parseTabHandle('tab:strip')).toBeNull()
    expect(parseTabHandle('tab:strip:')).toBeNull()
  })
})

describe('currentTab', () => {
  it('keeps the remembered tab while it exists', () => {
    expect(currentTab([tab('a'), tab('b')], 'b')).toBe('b')
  })

  it('falls back to the first when the remembered one was deleted', () => {
    expect(currentTab([tab('a'), tab('b')], 'gone')).toBe('a')
  })

  it('has nothing to open in an empty strip', () => {
    expect(currentTab([], 'a')).toBeNull()
  })
})

describe('hoverTarget', () => {
  const base = { activeId: 'palette:FORM', stripUid: 'strip', tabUids: ['a', 'b'], open: 'a' }

  it('opens the tab a foreign drag is resting on', () => {
    expect(hoverTarget({ ...base, overId: tabHandleId('strip', 'b') })).toBe('b')
  })

  it('leaves the open tab alone', () => {
    expect(hoverTarget({ ...base, overId: tabHandleId('strip', 'a') })).toBeNull()
  })

  it('ignores another strips handle', () => {
    expect(hoverTarget({ ...base, overId: tabHandleId('other', 'b') })).toBeNull()
  })

  it('ignores an ordinary drop zone', () => {
    expect(hoverTarget({ ...base, overId: 'slot:0.0.0:1' })).toBeNull()
  })

  it('ignores nothing hovered at all', () => {
    expect(hoverTarget({ ...base, overId: null })).toBeNull()
  })

  // dragging a tab among its siblings is a reorder: opening each one under the pointer would
  // resize the canvas mid-drag and move the gap the drop was aimed at
  it('stays out of the way while a tab is being reordered', () => {
    expect(hoverTarget({ ...base, activeId: 'node:a', overId: tabHandleId('strip', 'b') })).toBeNull()
    expect(hoverTarget({ ...base, activeId: 'node:b', overId: tabHandleId('strip', 'b') })).toBeNull()
  })

  it('still opens for a node dragged in from outside the strip', () => {
    expect(hoverTarget({ ...base, activeId: 'node:elsewhere', overId: tabHandleId('strip', 'b') })).toBe('b')
  })
})
