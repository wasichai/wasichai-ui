import { describe, expect, it } from 'vitest'
import { isAppPath, isFigure } from './Markdown'

describe('Markdown helpers', () => {
  it('tells a figure from a text', () => {
    for (const figure of ['S/ 1,234.50', '81,744', '-5 %', '2026', 'S/ 0.00', '12.5%']) expect(isFigure(figure), figure).toBe(true)
    for (const text of ['P-001', 'OMISO', '01-02-003', 'S/ total', '']) expect(isFigure(text), text).toBe(false)
  })

  it('follows only paths of the app in the app', () => {
    expect(isAppPath('/predios/abc')).toBe(true)
    expect(isAppPath('//evil.example')).toBe(false)
    expect(isAppPath('https://example.org')).toBe(false)
    expect(isAppPath(undefined)).toBe(false)
  })
})
