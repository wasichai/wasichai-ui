// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { blocks, contrast, resolveVar, rule, rules } from '../test/css'
import { customProperties, EXTENSION } from '../test/tokens'

// the optional portal-tributario sheet (ADR-035): the theme's tokens, then partials that paint the library's own
// components. its folder is copied to dist as is, so this test lives next to it, not in it

const dir = join(__dirname, 'portal-tributario')
const read = (file: string) => readFileSync(join(dir, file), 'utf8')

const PORTAL = "[data-theme='portal-tributario']"
const PARTIALS = ['controls.css', 'tables.css', 'tabs.css', 'alerts.css', 'nav.css']

// a partial paints the theme's subtree, but not one pinned to another theme inside it (the printed document sheet)
const SCOPE = `@scope (${PORTAL}) to ([data-theme]:not(${PORTAL}))`

// the hooks the library's components put (a sheet only styles those, rule 6): ui's and core's
const SLOTS = [
  'button',
  'card',
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
  'tabs-content',
  'alert',
  'alert-text',
  'alert-dismiss',
  'nav-tree',
  'nav-tree-group',
  'nav-tree-leaf',
  'nav-tree-caret'
]
const VARIANTS = ['primary', 'secondary', 'ghost', 'danger']
const SIZES = ['sm', 'md', 'icon']
const TONES = ['success', 'warning', 'danger', 'notice']

const base = readFileSync(join(__dirname, '..', 'theme.css'), 'utf8')
const tokens = rule(read('tokens.css'), PORTAL)

// a partial's rules: the unlayered ones, and the ones in @layer base (a default any class still overrides)
function layers(css: string): { unlayered: string; base: string } {
  const found = blocks(css)
  const body = (prelude: string) =>
    found
      .filter((block) => block.prelude === prelude)
      .map((block) => block.body)
      .join('\n')
  return { unlayered: body(SCOPE), base: blocks(body('@layer base')).find((block) => block.prelude === SCOPE)?.body ?? '' }
}

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

    // unlayered, a rule wins over tailwind's utilities whatever their specificity; in @layer base, any class wins over
    // it. either way it is scoped: light, dark and a subtree pinned to another theme never see it
    it("keeps every rule in the theme's scope, unlayered or in the base layer", () => {
      const found = blocks(css)
      expect(found.length).toBeGreaterThan(0)
      for (const { prelude, body } of found) {
        expect([SCOPE, '@layer base'], prelude).toContain(prelude)
        if (prelude === '@layer base') expect(blocks(body).map((inner) => inner.prelude)).toEqual([SCOPE])
      }
    })

    it('hooks every rule on a data-slot', () => {
      const selectors = rules(css).flatMap((r) => r.selectors)
      expect(selectors.filter((selector) => !selector.includes('[data-slot='))).toEqual([])
    })
  })

  // no srtm-ui data-ui hook, no app attribute: only what the library's components put
  it("hook only the library's own components", () => {
    const sheet = readdirSync(dir)
      .map((file) => read(file))
      .join('\n')
    expect(sheet).not.toMatch(/data-ui/)
    const values = (attribute: string) => [...sheet.matchAll(new RegExp(`\\[${attribute}='([^']+)'\\]`, 'g'))].map(([, value]) => value)
    for (const [, name] of sheet.matchAll(/\[(data-[a-z-]+)/g))
      expect(['data-theme', 'data-slot', 'data-variant', 'data-size', 'data-tone'], name).toContain(name)
    for (const slot of values('data-slot')) expect(SLOTS, slot).toContain(slot)
    for (const variant of values('data-variant')) expect(VARIANTS, variant).toContain(variant)
    for (const size of values('data-size')) expect(SIZES, size).toContain(size)
    for (const tone of values('data-tone')) expect(TONES, tone).toContain(tone)
  })
})

describe('controls.css', () => {
  const { unlayered: css } = layers(read('controls.css'))
  const BUTTON = "[data-slot='button']"
  const FIELDS = ":is([data-slot='input'], [data-slot='textarea'], [data-slot='select-trigger'])"
  const declared = (property: string) => rules(css).filter((r) => r.declarations.has(property))

  it("gives the buttons the prototype's type and room", () => {
    expect(rule(css, BUTTON).get('font-size')).toBe('15px')
    expect(rule(css, `${BUTTON}[data-size='md']`).get('padding')).toBe('10px 20px')
    expect(rule(css, `${BUTTON}[data-size='md']:is([data-variant='primary'], [data-variant='danger'])`).get('padding-inline')).toBe('26px')
    // sm keeps the library's 12px sides (the prototype's too), so a caller's px-0 still holds
    const small = rule(css, `${BUTTON}[data-size='sm']`)
    expect(small.get('padding-block')).toBe('5px')
    expect(small.has('padding')).toBe(false)
  })

  // what the tokens already paint (primary and danger fills, the radii) is left to the classes, so a caller's own
  // classes keep working; ghost stays the library's, so the shell's ghost buttons keep their colours on the shell
  it('leaves to the classes what the tokens already draw', () => {
    expect(declared('border-radius')).toEqual([])
    expect(rules(css).filter((r) => r.selectors.some((s) => s.includes("[data-variant='ghost']")))).toEqual([])
    for (const variant of ['primary', 'danger'])
      expect(
        rules(css).filter((r) => r.selectors.includes(`${BUTTON}[data-variant='${variant}']`)),
        variant
      ).toEqual([])
  })

  it('marks a disabled button without losing the not-allowed cursor', () => {
    const disabled = rule(css, `${BUTTON}:disabled`)
    expect(disabled.get('cursor')).toBe('not-allowed')
    expect(disabled.get('pointer-events')).toBe('auto')
  })

  // no padding: the library's sides stay, so a field's own (the search box's pl-8 around its icon) still holds
  it('draws the three fields alike, the input and the select trigger at one height', () => {
    const fields = rule(css, FIELDS)
    expect(fields.get('border-color')).toBe('#cccccc')
    expect(fields.get('font-size')).toBe('14.5px')
    expect(declared('padding')).toEqual(rules(css).filter((r) => r.selectors.some((s) => s.startsWith(BUTTON)) && r.declarations.has('padding')))
    expect(rule(css, ":is([data-slot='input'], [data-slot='select-trigger'])").get('height')).toBe('38px')
    expect(rule(css, `${FIELDS}:focus`).get('border-color')).toBe('var(--focus)')
  })

  it('keeps the danger border of an invalid field', () => {
    expect(rule(css, `${FIELDS}[aria-invalid='true']`).get('border-color')).toBe('var(--danger)')
  })

  // the greys it paints behind text: a secondary button keeps its own ink
  it('keeps AA over the greys it paints', () => {
    const hover = rule(css, `${BUTTON}[data-variant='secondary']:hover:not(:disabled)`).get('background')!
    expect(failing([['secondary hovered', 'var(--ink)', hover]])).toEqual([])
  })
})

describe('tables.css', () => {
  const { unlayered, base: defaults } = layers(read('tables.css'))
  const TABLE = "[data-slot='table']"

  it("draws the prototype's header", () => {
    const th = rule(unlayered, `${TABLE} th`)
    expect(th.get('padding')).toBe('11px 18px')
    expect(th.get('font-size')).toBe('13.5px')
    expect(th.get('font-weight')).toBe('700')
    expect(th.get('text-transform')).toBe('none')
    expect(th.get('white-space')).toBe('nowrap')
    expect(th.get('background-color')).toBe('var(--table-head)')
  })

  it('draws the cells over thin lines', () => {
    const td = rule(unlayered, `${TABLE} td`)
    expect(td.get('font-size')).toBe('14.5px')
    expect(td.get('border-bottom')).toBe('1px solid var(--line)')
  })

  // in the base layer: a row's own class (a selected row's bg-brand-soft, a hover) still wins over the stripe
  it('stripes the rows and draws the total as defaults a class overrides', () => {
    expect(rule(defaults, `${TABLE} > tbody > tr:nth-child(even)`).get('background-color')).toBe('var(--table-stripe)')
    const total = rule(defaults, `${TABLE} > tfoot td`)
    expect(total.get('font-weight')).toBe('700')
    expect(total.get('background-color')).toBe('var(--surface-muted)')
    expect(total.get('border-top')).toMatch(/^2px solid /)
    expect(unlayered).not.toMatch(/nth-child|tfoot/)
  })

  // the text over the backgrounds this partial paints: header, stripes and total
  it('keeps AA over the backgrounds it paints', () => {
    const th = rule(unlayered, `${TABLE} th`)
    const pairs: [string, string, string][] = [
      ['th', th.get('color')!, th.get('background-color')!],
      ...['ink', 'ink-muted', 'link', 'success', 'danger', 'warning'].map((name): [string, string, string] => [
        `${name} on stripe`,
        `var(--${name})`,
        'var(--table-stripe)'
      ]),
      ['ink on total', 'var(--ink)', rule(defaults, `${TABLE} > tfoot td`).get('background-color')!]
    ]
    expect(failing(pairs)).toEqual([])
  })
})

describe('tabs.css', () => {
  const { unlayered: css } = layers(read('tabs.css'))
  const TRIGGER = "[data-slot='tabs-trigger']"

  it('joins the active tab to its panel', () => {
    const active = rule(css, `${TRIGGER}[aria-selected='true']`)
    expect(active.get('background')).toBe('var(--surface)')
    expect(active.get('border-bottom-color')).toBe('var(--surface)')
    expect(rule(css, "[data-slot='tabs-content']").get('border-top')).toBe('0')
  })

  // the tabs sit on the page and the panel is the box. only a card steps aside, not any box that holds tabs
  it('makes the card that holds the tabs step aside', () => {
    const card = rule(css, "[data-slot='card']:has(> [data-slot='tabs'])")
    expect(card.get('border')).toBe('0')
    expect(card.get('background')).toBe('transparent')
    expect(card.get('box-shadow')).toBe('none')
    expect(rules(css).flatMap((r) => r.selectors)).not.toContain(":has(> [data-slot='tabs'])")
  })

  it('draws the line under the strip as its background', () => {
    const list = rule(css, "[data-slot='tabs-list']")
    expect(list.get('border-bottom')).toBe('0')
    expect(list.get('background')).toMatch(/^linear-gradient\(var\(--brand\), var\(--brand\)\) bottom/)
  })

  // many long tabs need some 1240px at the prototype's size: a narrower strip tightens them
  it('tightens the tabs in a narrow container', () => {
    expect(rule(css, "[data-slot='tabs']").get('container-type')).toBe('inline-size')
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

describe('alerts.css', () => {
  const { unlayered: css } = layers(read('alerts.css'))
  const ALERT = "[data-slot='alert']"

  // bootstrap 3's borders (no token); background and text are the tone's tokens
  it.each([
    ['success', '#d6e9c6'],
    ['warning', '#faebcc'],
    ['danger', '#ebccd1'],
    ['notice', '#e8e0c4']
  ])('paints %s with its soft background, its text and its border', (tone, border) => {
    const box = rule(css, `${ALERT}[data-tone='${tone}']`)
    expect(box.get('background')).toBe(`var(--${tone}-soft)`)
    expect(box.get('color')).toBe(`var(--${tone})`)
    expect(box.get('border-color')).toBe(border)
  })

  it('draws the box as the prototype', () => {
    const box = rule(css, ALERT)
    expect(box.get('display')).toBe('flex')
    expect(box.get('padding')).toBe('14px 18px')
    expect(box.get('border')).toBe('1px solid')
    expect(box.get('border-radius')).toBe('3px')
    expect(box.get('font-size')).toBe('14.5px')
    expect(box.get('line-height')).toBe('1.6')
  })

  // the text takes the width, so the check stays at the top right
  it('keeps the dismiss check at the top right', () => {
    expect(rule(css, "[data-slot='alert-text']").get('flex')).toBe('1')
    const dismiss = rule(css, "[data-slot='alert-dismiss']")
    expect(dismiss.get('margin-left')).toBe('0')
    expect(dismiss.get('padding')).toBe('3px')
  })

  it('keeps AA for every tone on its box', () => {
    const pairs = ['success', 'warning', 'danger', 'notice'].map((tone): [string, string, string] => [tone, `var(--${tone})`, `var(--${tone}-soft)`])
    expect(failing(pairs)).toEqual([])
  })
})

describe('nav.css', () => {
  const { unlayered: css } = layers(read('nav.css'))
  const TREE = "[data-slot='nav-tree']"
  const part = (selector: string) => rule(css, `${TREE} ${selector}`)
  const CURRENT = "[data-slot='nav-tree-leaf'][aria-current='page']"
  const HOVER = "[data-slot='nav-tree-leaf']:hover"
  const current = part(CURRENT)
  const hover = part(HOVER)
  const group = part("[data-slot='nav-tree-group']:hover")
  const caret = part("[data-slot='nav-tree-caret']")

  it('only styles the tree', () => {
    const selectors = rules(css).flatMap((r) => r.selectors)
    expect(selectors.length).toBeGreaterThan(0)
    expect(selectors.filter((selector) => !selector.startsWith(`${TREE} `))).toEqual([])
  })

  it("pins the prototype's current leaf, hovers and carets", () => {
    expect(current.get('color')).toBe('#0d4d80')
    expect(current.get('background-color')).toBe('#e6e6e6')
    expect(hover.get('background-color')).toBe('#e9e9e9')
    expect(group.get('color')).toBe('#0d4d80')
    expect(caret.get('color')).toBe('#555555')
  })

  // as specific as the hover, and after it: the current leaf keeps its background under the pointer
  it('puts the current leaf after the hover', () => {
    const selectors = rules(css).flatMap((r) => r.selectors)
    expect(selectors.indexOf(`${TREE} ${CURRENT}`)).toBeGreaterThan(selectors.indexOf(`${TREE} ${HOVER}`))
  })

  // over the lateral (table-head): a hovered leaf, the current one and a hovered group at 4.5:1; the caret, a graphic
  // next to its group's name, at 3:1
  it('keeps AA over the backgrounds it paints', () => {
    expect(
      failing([
        ['link on a hovered leaf', 'var(--link)', hover.get('background-color')!],
        ['current leaf', current.get('color')!, current.get('background-color')!],
        ['hovered group', group.get('color')!, 'var(--table-head)']
      ])
    ).toEqual([])
    expect(failing([['caret', caret.get('color')!, 'var(--table-head)']], 3)).toEqual([])
  })
})
