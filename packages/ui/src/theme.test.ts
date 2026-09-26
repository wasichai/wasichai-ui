import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(__dirname, 'theme.css'), 'utf8')

// the custom properties declared inside the first block whose selector list contains `selector`
function tokens(selector: string): string[] {
  const block = css.split('}').find((chunk) => chunk.split('{')[0].includes(selector))
  if (!block) throw new Error(`no block for ${selector}`)
  return [...block.split('{')[1].matchAll(/--([a-z-]+)\s*:/g)].map((match) => match[1]).sort()
}

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
