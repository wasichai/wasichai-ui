// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { blocks, contrast, resolveVar, rule, rules } from './css'

describe('rule', () => {
  const css = `/* a comment { with braces } */
@layer base {
    [data-theme='x'] body,
    [data-theme='x'] :is(a, b) {
        color: red;
        --token: var(--other);
    }
}`

  it('reads the declarations of the innermost rule, through layers and comments', () => {
    const declarations = rule(css, "[data-theme='x'] body")
    expect(declarations.get('color')).toBe('red')
    expect(declarations.get('--token')).toBe('var(--other)')
  })

  it('splits a selector list by its top-level commas only', () => {
    expect(rules(css)[0].selectors).toEqual(["[data-theme='x'] body", "[data-theme='x'] :is(a, b)"])
  })

  it('throws for a selector no rule has', () => {
    expect(() => rule(css, '.missing')).toThrow('no rule for .missing')
  })
})

describe('blocks', () => {
  it('lists the outermost blocks with their preludes, whatever they nest', () => {
    const css = `@import './a.css';
/* { */
@scope (.a) to (.b) {
    .c { color: red; }
    @container (max-width: 10px) { .c { color: blue; } }
}
@layer base {
    @scope (.a) { tr { color: green; } }
}`
    const found = blocks(css)
    expect(found.map((block) => block.prelude)).toEqual(['@scope (.a) to (.b)', '@layer base'])
    expect(rule(found[1].body, 'tr').get('color')).toBe('green')
  })
})

describe('resolveVar', () => {
  it('follows var() to the value it names', () => {
    const tokens = new Map([
      ['--brand', '#123456'],
      ['--link', 'var(--brand)'],
      ['--focus', 'var(--link)']
    ])
    expect(resolveVar(tokens, 'focus')).toBe('#123456')
    expect(resolveVar(tokens, 'brand')).toBe('#123456')
  })

  it('throws for a token the block does not set', () => {
    expect(() => resolveVar(new Map(), 'ink')).toThrow('no --ink')
  })
})

describe('contrast', () => {
  it('follows WCAG 2.x', () => {
    expect(contrast('#000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('rgb(255 255 255)', '#fff')).toBe(1)
    expect(contrast('#767676', '#fff')).toBeCloseTo(4.54, 2)
    expect(contrast('#fff', '#767676')).toBe(contrast('#767676', '#fff'))
  })

  it('reads oklch as css does', () => {
    expect(contrast('oklch(100% 0 0)', 'oklch(0% 0 0)')).toBeCloseTo(21, 3)
    expect(contrast('oklch(62.8% 0.2577 29.23)', '#ff0000')).toBeCloseTo(1, 2)
    // base light danger over the base light surface
    expect(contrast('oklch(55% 0.19 25)', 'oklch(99% 0.002 260)')).toBeCloseTo(5.2, 1)
  })

  it('refuses what it cannot measure', () => {
    expect(() => contrast('var(--ink)', '#fff')).toThrow('not a plain color')
  })
})
