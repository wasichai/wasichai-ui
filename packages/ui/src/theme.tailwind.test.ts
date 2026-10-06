// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

// require.resolve skips the `style` export, so the bare package is spelled out as its index.css
async function loadStylesheet(id: string, base: string) {
  const path = id.startsWith('.') ? resolve(base, id) : require.resolve(id === 'tailwindcss' ? 'tailwindcss/index.css' : id)
  return { path, base: dirname(path), content: await readFile(path, 'utf8') }
}

// what an app gets: tailwind first, then this theme (the app's index.css does the same)
async function build(candidates: string[]): Promise<string> {
  const compiler = await compile("@import 'tailwindcss';\n@import './theme.css';", { base: __dirname, loadStylesheet })
  return compiler.build(candidates)
}

describe('theme.css under tailwind', () => {
  it('lets a theme change the bare rounded, still 0.25rem by default', async () => {
    const output = await build(['rounded'])
    expect(output).toMatch(/\.rounded\s*\{\s*border-radius:\s*var\(--radius\);/)
    expect(output).toMatch(/--radius:\s*0\.25rem;/)
  })

  it('generates the extension colors', async () => {
    expect(await build(['bg-danger-soft'])).toMatch(/\.bg-danger-soft\s*\{\s*background-color:\s*var\(--danger-soft\);/)
  })

  it('lets a theme change the font', async () => {
    expect(await build(['font-sans'])).toMatch(/\.font-sans\s*\{\s*font-family:\s*var\(--font-sans\);/)
  })
})

// every package's sources, tests left out
function sources(dir: string): string[] {
  try {
    if (!statSync(dir).isDirectory()) return []
  } catch {
    return []
  }
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === 'node_modules' || name === 'dist') return []
    if (statSync(path).isDirectory()) return sources(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

// a color utility, variants included (hover:, aria-[invalid=true]:). fill- and stroke- are left out:
// maplibre's paint properties ('fill-color') look just like them
const COLOR_CLASS = /^(?:[a-z0-9-]+(?:-\[[^\]\s]+\])?:)*-?(?:bg|text|border|ring|outline|divide|placeholder|accent|decoration|caret|shadow)-[a-z]/
const LITERAL = /'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g
// what tailwind writes in a selector for a class name
const escapeClass = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)

describe('packages under tailwind', () => {
  // a class naming a color no theme defines generates nothing, and nothing says so: bg-danger-soft
  // drew no background for months (ADR-031 D19)
  it('only write color classes the theme can generate', async () => {
    const root = join(__dirname, '..', '..')
    const found = new Map<string, string>()
    for (const file of readdirSync(root).flatMap((pkg) => sources(join(root, pkg, 'src')))) {
      for (const match of readFileSync(file, 'utf8').matchAll(LITERAL)) {
        for (const candidate of (match[1] ?? match[2] ?? match[3] ?? '').split(/\s+/)) {
          if (COLOR_CLASS.test(candidate) && !candidate.includes('${')) found.set(candidate, relative(root, file))
        }
      }
    }
    expect(found.size).toBeGreaterThan(50)
    const output = await build([...found.keys()])
    const missing = [...found].filter(([candidate]) => !output.includes(`.${escapeClass(candidate)}`)).map(([candidate, file]) => `${file}: ${candidate}`)
    expect(missing).toEqual([])
  })
})
