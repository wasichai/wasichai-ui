// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
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
