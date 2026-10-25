import { describe, expect, it } from 'vitest'
import { OTHER_COLOR, colorExpression, featureStyleOf, legendItems, styleFromParams, styleParams, styleTypeFor, type StyleClasses } from './style'

const categories: StyleClasses = {
  by: 'uso',
  type: 'categories',
  classes: [
    { label: 'vivienda', color: '#8dd3c7', value: 'vivienda' },
    { label: 'true', color: '#ffffb3', value: true }
  ]
}

const quantiles: StyleClasses = {
  by: 'arancel',
  type: 'quantiles',
  classes: [
    { label: '0 – 10', color: '#ffffcc', min: 0, max: 10 },
    { label: '10 – 20', color: '#800026', min: 10, max: 20 }
  ]
}

describe('attribute styles', () => {
  it('matches categories as text, grey for the rest', () => {
    expect(colorExpression(categories)).toEqual(['match', ['to-string', ['get', 'uso']], 'vivienda', '#8dd3c7', 'true', '#ffffb3', OTHER_COLOR])
  })

  it('steps quantiles from each min, grey below and for a missing value', () => {
    expect(colorExpression(quantiles)).toEqual([
      'case',
      ['==', ['typeof', ['get', 'arancel']], 'number'],
      ['step', ['get', 'arancel'], OTHER_COLOR, 0, '#ffffcc', 10, '#800026'],
      OTHER_COLOR
    ])
  })

  it('paints everything grey when there are no classes', () => {
    expect(colorExpression({ ...quantiles, classes: [] })).toBe(OTHER_COLOR)
  })

  it('lists the legend in class order and has no paint without classes', () => {
    expect(legendItems(quantiles)).toEqual([
      { label: '0 – 10', color: '#ffffcc' },
      { label: '10 – 20', color: '#800026' }
    ])
    expect(legendItems(null)).toEqual([])
    expect(featureStyleOf(undefined)).toBeUndefined()
  })

  it('gives each field type the one kind of style the server accepts', () => {
    expect(styleTypeFor('DECIMAL')).toBe('quantiles')
    expect(styleTypeFor('ENUM')).toBe('categories')
    expect(styleTypeFor('BOOLEAN')).toBe('categories')
    expect(styleTypeFor('DATE')).toBeNull()
    expect(styleTypeFor('GEOMETRY')).toBeNull()
  })

  it('round-trips through url params, dropping what the server would refuse', () => {
    expect(styleFromParams(new URLSearchParams(styleParams({ by: 'arancel', type: 'quantiles', classes: 4 })))).toEqual({
      by: 'arancel',
      type: 'quantiles',
      classes: 4
    })
    expect(styleFromParams(new URLSearchParams('by=arancel&type=quantiles&classes=20'))).toEqual({ by: 'arancel', type: 'quantiles' })
    expect(styleFromParams(new URLSearchParams('by=uso&type=cuantiles'))).toBeNull()
    expect(styleParams(null)).toEqual({})
  })
})
