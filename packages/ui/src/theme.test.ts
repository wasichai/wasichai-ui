import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrast, resolveVar, rule } from './test/css'
import { BASE, customProperties, EXTENSION } from './test/tokens'

const css = readFileSync(join(__dirname, 'theme.css'), 'utf8')

// the custom properties a block sets, without their leading dashes
const tokens = (selector: string) => customProperties(rule(css, selector)).map((name) => name.slice(2))

describe('theme.css', () => {
  it('dark sets every token light sets', () => {
    expect(tokens("[data-theme='light']").length).toBeGreaterThan(10)
    expect(tokens("[data-theme='dark']")).toEqual(tokens("[data-theme='light']"))
  })

  it('maps every token to a tailwind color', () => {
    const mapped = tokens('@theme inline').map((name) => name.replace(/^color-/, ''))
    expect(mapped).toEqual(expect.arrayContaining(tokens("[data-theme='light']")))
  })
})

// light and dark alias these, so adding them changed nothing already drawn
const ALIASES = { link: 'brand', focus: 'brand', 'table-head': 'surface-muted', line: 'border' }

// text on the background it sits on: AA, 4.5:1
const TEXT_ON = [
  ['success', 'surface'],
  ['success', 'success-soft'],
  ['danger', 'danger-soft'],
  ['warning', 'warning-soft'],
  ['notice', 'notice-soft'],
  ['link', 'surface']
]

// known misses, as `<theme>: <text> on <background>`. a listed pair must stay below AA: once fixed, drop it
const BELOW_AA: string[] = []

describe.each(['light', 'dark'])('%s theme', (theme) => {
  const block = rule(css, `[data-theme='${theme}']`)

  it('sets the base and the extension tokens, nothing else', () => {
    expect(tokens(`[data-theme='${theme}']`)).toEqual([...BASE, ...EXTENSION].sort())
  })

  it('aliases link, focus, table-head and line to base tokens, so it looks as before', () => {
    for (const [token, base] of Object.entries(ALIASES)) expect(block.get(`--${token}`), token).toBe(`var(--${base})`)
  })

  it('keeps the lotes map selection orange', () => {
    expect(block.get('--map-selected')).toBe('#e8590c')
  })

  it.each(TEXT_ON)('%s on %s reaches AA, or is a listed miss', (text, background) => {
    const ratio = contrast(resolveVar(block, text), resolveVar(block, background))
    if (BELOW_AA.includes(`${theme}: ${text} on ${background}`)) expect(ratio, 'reaches AA now: drop it from BELOW_AA').toBeLessThan(4.5)
    else expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('focus ring reaches 3:1 on the surface (WCAG 1.4.11)', () => {
    expect(contrast(resolveVar(block, 'focus'), resolveVar(block, 'surface'))).toBeGreaterThanOrEqual(3)
  })
})

describe('@theme', () => {
  it('maps every extension token to a tailwind color', () => {
    const inline = rule(css, '@theme inline')
    for (const name of EXTENSION) expect(inline.get(`--color-${name}`), name).toBe(`var(--${name})`)
  })

  // inline would bake 0.25rem into `rounded`; a theme variable stays a var() a theme can set
  it('declares --radius as a theme variable, not inline', () => {
    expect(rule(css, '@theme').get('--radius')).toBe('0.25rem')
    expect(rule(css, '@theme inline').has('--radius')).toBe(false)
  })
})

// a fixed palette class ignores the theme. print: is paper, always light.
const PALETTE = 'gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const FIXED = new RegExp(`(?<![\\w:-])(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:white|black|(?:${PALETTE})-\\d{2,3})\\b`)

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === 'node_modules' || name === 'dist') return []
    if (statSync(path).isDirectory()) return sources(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

// a package without a src folder (or a src that is not a directory) has no sources to scan
function packageSources(dir: string): string[] {
  try {
    if (!statSync(dir).isDirectory()) return []
  } catch {
    return []
  }
  return sources(dir)
}

describe('packages', () => {
  it('use theme tokens, not fixed palette colors', () => {
    const root = join(__dirname, '..', '..')
    const offenders = readdirSync(root)
      .flatMap((pkg) => packageSources(join(root, pkg, 'src')).map((file) => ({ file, text: readFileSync(file, 'utf8') })))
      .flatMap(({ file, text }) => text.split('\n').flatMap((line, index) => (FIXED.test(line) ? [`${relative(root, file)}:${index + 1}`] : [])))
    expect(offenders).toEqual([])
  })
})
