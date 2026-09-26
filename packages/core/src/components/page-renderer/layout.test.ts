import { describe, expect, it } from 'vitest'
import { regionKeys, regionStyle } from './layout'
import type { PageTemplate } from '../../types/metadata'

const sidebar: PageTemplate = {
  name: 'header-and-right-sidebar',
  columns: 12,
  rows: [
    { regions: [{ name: 'HEADER', span: 12 }] },
    {
      regions: [
        { name: 'MAIN', span: 8 },
        { name: 'RIGHT', span: 4 }
      ]
    }
  ]
}

describe('regionStyle', () => {
  // tailwind cannot build a class from a runtime number, so the width has to be inline
  it('turns a span into a flex share', () => {
    expect(regionStyle(8)).toEqual({ flexGrow: 8, flexBasis: 0 })
  })
})

describe('regionKeys', () => {
  it('flattens the rows in reading order', () => {
    expect(regionKeys(sidebar)).toEqual(['HEADER', 'MAIN', 'RIGHT'])
  })
})
