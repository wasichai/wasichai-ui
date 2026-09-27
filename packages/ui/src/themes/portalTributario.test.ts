// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrast, resolveVar, rule, rules } from '../test/css'

// the optional portal-tributario sheet (ADR-035): the theme's tokens, then partials that paint the library's own
// components. its folder is copied to dist as is, so this test lives next to it, not in it

const dir = join(__dirname, 'portal-tributario')
const read = (file: string) => readFileSync(join(dir, file), 'utf8')

const PORTAL = "[data-theme='portal-tributario']"
const PARTIALS = ['controls.css', 'tables.css', 'tabs.css']

// the tokens theme.css adds to the 18 base ones; listed here too, so a token missing from theme.css still fails
const EXTENSION = ['success-soft', 'danger-soft', 'notice', 'notice-soft', 'link', 'focus', 'table-head', 'table-stripe', 'line', 'map-selected']

// the hooks the library's components put (a sheet only styles those, rule 6)
const SLOTS = [
  'button',
  'input',
  'textarea',
  'select-trigger',
  'table',
  'table-head',
  'table-cell',
  'badge',
  'tabs',
  'tabs-list',
  'tabs-trigger',
  'tabs-content'
]
const VARIANTS = ['primary', 'secondary', 'ghost', 'danger']
const SIZES = ['sm', 'md', 'icon']

const base = readFileSync(join(__dirname, '..', 'theme.css'), 'utf8')
const tokens = rule(read('tokens.css'), PORTAL)

const customProperties = (declarations: Map<string, string>) => [...declarations.keys()].filter((name) => name.startsWith('--')).sort()

// a declared colour: a var() of a token followed to the theme's value, a plain colour as is
function paint(value: string | undefined): string {
  if (value === undefined) throw new Error('no colour')
  const alias = /^var\(--([a-z-]+)\)$/.exec(value)
  return alias ? resolveVar(tokens, alias[1]) : value
}

// every pair that falls short of `min`, with its ratio
const failing = (pairs: [string, string, string][], min = 4.5) =>
  pairs.flatMap(([name, text, background]) => {
    const ratio = contrast(paint(text), paint(background))
    return ratio >= min ? [] : [`${name}: ${ratio.toFixed(2)}`]
  })

describe('tokens.css', () => {
  it('sets every token of the light theme', () => {
    const required = customProperties(rule(base, "[data-theme='light']"))
    expect(required.length).toBeGreaterThan(10)
    expect(customProperties(tokens)).toEqual(expect.arrayContaining(required))
  })

  it('sets every extension token', () => {
    expect(customProperties(tokens)).toEqual(expect.arrayContaining(EXTENSION.map((name) => `--${name}`)))
  })

  it('uses arial, 3px corners, 14px text and its own focus ring', () => {
    const css = read('tokens.css')
    expect(tokens.get('--font-sans')).toBe('Arial, Helvetica, sans-serif')
    for (const radius of ['--radius', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-card'])
      expect(tokens.get(radius), radius).toBe('3px')
    const body = rule(css, `${PORTAL} body`)
    expect(body.get('font-size')).toBe('14px')
    expect(body.get('line-height')).toBe('1.45')
    const focus = rule(css, `${PORTAL} *:focus-visible`)
    expect(focus.get('outline')).toBe('2px solid var(--focus)')
    expect(focus.get('outline-offset')).toBe('1px')
  })

  it('reaches WCAG AA (4.5:1) on every text pair', () => {
    const pairs: [string, string][] = [
      ...['ink', 'ink-muted', 'brand-strong', 'danger', 'success', 'warning', 'link'].map((text): [string, string] => [text, 'surface']),
      ['on-brand', 'brand'],
      ['shell-ink', 'shell'],
      ['on-danger', 'danger'],
      ['success', 'success-soft'],
      ['warning', 'warning-soft'],
      ['danger', 'danger-soft'],
      ['notice', 'notice-soft']
    ]
    expect(failing(pairs.map(([text, background]) => [`${text} on ${background}`, `var(--${text})`, `var(--${background})`]))).toEqual([])
  })

  // WCAG 1.4.11 (non-text contrast): the focus ring and the focused field's border, over the page
  it('draws its focus at 3:1 or more over the surface', () => {
    expect(failing([['focus on surface', 'var(--focus)', 'var(--surface)']], 3)).toEqual([])
  })
})

describe('partials', () => {
  it('are the ones listed here, and the folder holds only the sheet', () => {
    expect(readdirSync(dir).sort()).toEqual(['index.css', 'tokens.css', ...PARTIALS].sort())
  })

  it('index.css imports the tokens first', () => {
    const imports = [...read('index.css').matchAll(/@import '([^']+)';/g)].map(([, path]) => path)
    expect(imports[0]).toBe('./tokens.css')
  })

  describe.each(PARTIALS)('%s', (file) => {
    const css = read(file)

    it('is imported by index.css, after the tokens', () => {
      const index = read('index.css')
      expect(index.indexOf(`@import './${file}';`)).toBeGreaterThan(index.indexOf("@import './tokens.css';"))
    })

    it('scopes every rule to the theme', () => {
      const selectors = rules(css).flatMap((r) => r.selectors)
      expect(selectors.length).toBeGreaterThan(0)
      expect(selectors.filter((selector) => !selector.startsWith(`${PORTAL} `))).toEqual([])
    })

    // a rule without a layer wins over tailwind's utilities, whatever their specificity
    it('stays outside any layer', () => {
      expect(css).not.toMatch(/@layer/)
    })
  })

  // no srtm-ui data-ui hook, no app attribute: only what the library's components put
  it("hook only the library's own components", () => {
    const sheet = readdirSync(dir)
      .map((file) => read(file))
      .join('\n')
    expect(sheet).not.toMatch(/data-ui/)
    const values = (attribute: string) => [...sheet.matchAll(new RegExp(`\\[${attribute}='([^']+)'\\]`, 'g'))].map(([, value]) => value)
    for (const [, name] of sheet.matchAll(/\[(data-[a-z-]+)/g)) expect(['data-theme', 'data-slot', 'data-variant', 'data-size'], name).toContain(name)
    for (const slot of values('data-slot')) expect(SLOTS, slot).toContain(slot)
    for (const variant of values('data-variant')) expect(VARIANTS, variant).toContain(variant)
    for (const size of values('data-size')) expect(SIZES, size).toContain(size)
  })
})

describe('controls.css', () => {
  const css = read('controls.css')
  const BUTTON = `${PORTAL} [data-slot='button']`
  const FIELDS = ":is([data-slot='input'], [data-slot='textarea'], [data-slot='select-trigger'])"

  it('paints the primary button in brand, brand-strong on hover', () => {
    expect(rule(css, `${BUTTON}[data-variant='primary']`).get('background')).toBe('var(--brand)')
    expect(rule(css, `${BUTTON}[data-variant='primary']:hover:not(:disabled)`).get('background')).toBe('var(--brand-strong)')
  })

  it('marks a disabled button without losing the not-allowed cursor', () => {
    const disabled = rule(css, `${BUTTON}:disabled`)
    expect(disabled.get('cursor')).toBe('not-allowed')
    expect(disabled.get('pointer-events')).toBe('auto')
  })

  it('draws the three fields alike, the input and the select trigger at one height', () => {
    const fields = rule(css, `${PORTAL} ${FIELDS}`)
    expect(fields.get('border-color')).toBe('#cccccc')
    expect(fields.get('padding')).toBe('8px 10px')
    expect(fields.get('font-size')).toBe('14.5px')
    expect(rule(css, `${PORTAL} :is([data-slot='input'], [data-slot='select-trigger'])`).get('height')).toBe('38px')
    expect(rule(css, `${PORTAL} ${FIELDS}:focus`).get('border-color')).toBe('var(--focus)')
  })

  it('keeps the danger border of an invalid field', () => {
    expect(rule(css, `${PORTAL} ${FIELDS}[aria-invalid='true']`).get('border-color')).toBe('var(--danger)')
  })

  // the greys it paints behind text: a secondary button keeps its own ink, a ghost one turns link
  it('keeps AA over the greys it paints', () => {
    const hover = (variant: string) => rule(css, `${BUTTON}[data-variant='${variant}']:hover:not(:disabled)`).get('background')!
    const ghost = rule(css, `${BUTTON}[data-variant='ghost']`).get('color')!
    const pairs: [string, string, string][] = [
      ['secondary hovered', 'var(--ink)', hover('secondary')],
      ['ghost hovered', ghost, hover('ghost')]
    ]
    expect(failing(pairs)).toEqual([])
  })
})

describe('tables.css', () => {
  const css = read('tables.css')
  const TABLE = `${PORTAL} [data-slot='table']`

  it("draws the prototype's header", () => {
    const th = rule(css, `${TABLE} th`)
    expect(th.get('padding')).toBe('11px 18px')
    expect(th.get('font-size')).toBe('13.5px')
    expect(th.get('font-weight')).toBe('700')
    expect(th.get('text-transform')).toBe('none')
    expect(th.get('white-space')).toBe('nowrap')
    expect(th.get('background-color')).toBe('var(--table-head)')
  })

  it('draws the cells over thin lines', () => {
    const td = rule(css, `${TABLE} td`)
    expect(td.get('font-size')).toBe('14.5px')
    expect(td.get('border-bottom')).toBe('1px solid var(--line)')
    expect(rule(css, `${TABLE} td a`).get('white-space')).toBe('nowrap')
  })

  it('stripes the rows, but a selected one', () => {
    expect(rule(css, `${TABLE} > tbody > tr:nth-child(even):not([aria-selected='true'])`).get('background-color')).toBe('var(--table-stripe)')
  })

  it('draws the total row of the foot', () => {
    const total = rule(css, `${TABLE} > tfoot td`)
    expect(total.get('font-weight')).toBe('700')
    expect(total.get('background-color')).toBe('var(--surface-muted)')
    expect(total.get('border-top')).toMatch(/^2px solid /)
  })

  // the text over the backgrounds this partial paints: header, stripes and total
  it('keeps AA over the backgrounds it paints', () => {
    const th = rule(css, `${TABLE} th`)
    const pairs: [string, string, string][] = [
      ['th', th.get('color')!, th.get('background-color')!],
      ...['ink', 'ink-muted', 'link', 'success', 'danger', 'warning'].map((name): [string, string, string] => [
        `${name} on stripe`,
        `var(--${name})`,
        'var(--table-stripe)'
      ]),
      ['ink on total', 'var(--ink)', rule(css, `${TABLE} > tfoot td`).get('background-color')!]
    ]
    expect(failing(pairs)).toEqual([])
  })
})

describe('tabs.css', () => {
  const css = read('tabs.css')
  const TRIGGER = `${PORTAL} [data-slot='tabs-trigger']`

  it('joins the active tab to its panel', () => {
    const active = rule(css, `${TRIGGER}[aria-selected='true']`)
    expect(active.get('background')).toBe('var(--surface)')
    expect(active.get('border-bottom-color')).toBe('var(--surface)')
    expect(rule(css, `${PORTAL} [data-slot='tabs-content']`).get('border-top')).toBe('0')
  })

  // the tabs sit on the page and the panel is the box
  it('makes the box that holds the tabs step aside', () => {
    const box = rule(css, `${PORTAL} :has(> [data-slot='tabs'])`)
    expect(box.get('border')).toBe('0')
    expect(box.get('background')).toBe('transparent')
    expect(box.get('box-shadow')).toBe('none')
  })

  it('draws the line under the strip as its background', () => {
    const list = rule(css, `${PORTAL} [data-slot='tabs-list']`)
    expect(list.get('border-bottom')).toBe('0')
    expect(list.get('background')).toMatch(/^linear-gradient\(var\(--brand\), var\(--brand\)\) bottom/)
  })

  // many long tabs need some 1240px at the prototype's size: a narrower strip tightens them
  it('tightens the tabs in a narrow container', () => {
    expect(rule(css, `${PORTAL} [data-slot='tabs']`).get('container-type')).toBe('inline-size')
    const sizes = rules(css)
      .filter((r) => r.selectors.includes(TRIGGER))
      .map((r) => r.declarations.get('font-size'))
    expect(sizes).toEqual(['16px', '15px', '14px'])
  })

  it('keeps AA over the grey of an inactive tab', () => {
    const inactive = rule(css, TRIGGER)
    const pairs: [string, string, string][] = [
      ['inactive', inactive.get('color')!, inactive.get('background')!],
      ['hovered', rule(css, `${TRIGGER}:hover:not(:disabled)`).get('color')!, inactive.get('background')!],
      ['active', rule(css, `${TRIGGER}[aria-selected='true']`).get('color')!, 'var(--surface)']
    ]
    expect(failing(pairs)).toEqual([])
  })
})
