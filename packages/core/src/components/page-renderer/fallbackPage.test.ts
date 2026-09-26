import { describe, expect, it } from 'vitest'
import { fallbackPage } from './fallbackPage'

describe('fallbackPage', () => {
  it('lays out the whole form, one list per relationship and the history in one full-width region', () => {
    const page = fallbackPage('predio', [
      { relationship: 'predio_titular', label: 'Titular', type: 'MANY_TO_ONE', objectName: 'titular', objectLabel: 'Titular', many: false }
    ])

    expect(page.objectName).toBe('predio')
    expect(page.generated).toBe(true)
    expect(page.template.rows).toEqual([{ regions: [{ name: 'MAIN', span: 12 }] }])
    const region = page.definition.page.children[0]
    expect(region.region).toBe('MAIN')
    expect(region.children.map((child) => [child.type, child.relationship, child.fields])).toEqual([
      ['FORM', null, null],
      ['RELATED_LIST', 'predio_titular', null],
      ['HISTORY', null, null]
    ])
  })
})
