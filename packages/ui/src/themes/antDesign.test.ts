// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { blocks, contrast, resolveVar, rule, rules } from '../test/css'
import { customProperties, EXTENSION } from '../test/tokens'

// the optional ant-design sheet (ADR-035): the theme's tokens, then partials that paint the library's own components
// as antd's. its folder is copied to dist as is, so this test lives next to it, not in it

const dir = join(__dirname, 'ant-design')
const read = (file: string) => readFileSync(join(dir, file), 'utf8')

const ANT = "[data-theme='ant-design']"
const PARTIALS = ['controls.css', 'display.css', 'tables.css', 'tabs.css', 'alerts.css', 'nav.css']

// a partial paints the theme's subtree, but not one pinned to another theme inside it (the printed document sheet)
const SCOPE = `@scope (${ANT}) to ([data-theme]:not(${ANT}))`

// the hooks the library's components put (a sheet only styles those, rule 6): ui's and core's
const SLOTS = [
  'button',
  'card',
  'input',
  'textarea',
  'select-trigger',
  'table',
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
const tokens = rule(read('tokens.css'), ANT)

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

  // antd 5's seed and map tokens: the layout grey, the borders, the sider, the primary tint
  it("keeps antd's own neutrals and tints", () => {
    expect(tokens.get('--surface')).toBe('#ffffff')
    expect(tokens.get('--surface-muted')).toBe('#f5f5f5')
    expect(tokens.get('--border')).toBe('#d9d9d9')
    expect(tokens.get('--line')).toBe('#f0f0f0')
    expect(tokens.get('--table-head')).toBe('#fafafa')
    expect(tokens.get('--shell')).toBe('#001529')
    expect(tokens.get('--brand-soft')).toBe('#e6f4ff')
  })

  it("uses antd's font stack, 6px corners (4px small, 8px large), 14px text at 22px and its own focus ring", () => {
    const css = read('tokens.css')
    expect(tokens.get('--font-sans')).toMatch(/^-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto/)
    expect(tokens.get('--radius')).toBe('6px')
    expect(tokens.get('--radius-sm')).toBe('4px')
    expect(tokens.get('--radius-md')).toBe('6px')
    expect(tokens.get('--radius-lg')).toBe('8px')
    expect(tokens.get('--radius-card')).toBe('8px')
    const body = rule(css, `${ANT} body`)
    expect(body.get('font-size')).toBe('14px')
    expect(body.get('line-height')).toBe('1.5714')
    const focus = rule(css, `${ANT} *:focus-visible`)
    expect(focus.get('outline')).toBe('2px solid var(--focus)')
    expect(focus.get('outline-offset')).toBe('1px')
  })

  it('reaches WCAG AA (4.5:1) on every text pair', () => {
    const pairs: [string, string][] = [
      ...['ink', 'ink-muted', 'brand', 'brand-strong', 'danger', 'success', 'warning', 'link'].map((text): [string, string] => [text, 'surface']),
      ...['ink', 'ink-muted', 'link'].map((text): [string, string] => [text, 'surface-muted']),
      ['on-brand', 'brand'],
      ['on-brand', 'brand-strong'],
      ['brand', 'brand-soft'],
      ['brand-strong', 'brand-soft'],
      ['shell-ink', 'shell'],
      ['shell-muted', 'shell'],
      ['on-danger', 'danger'],
      ['success', 'success-soft'],
      ['warning', 'warning-soft'],
      ['danger', 'danger-soft'],
      ['notice', 'notice-soft']
    ]
    expect(failing(pairs.map(([text, background]) => [`${text} on ${background}`, `var(--${text})`, `var(--${background})`]))).toEqual([])
  })

  // WCAG 1.4.11 (non-text contrast): the focus ring and the focused field's border, over the page and the layout
  it('draws its focus at 3:1 or more over the surfaces', () => {
    expect(
      failing(
        [
          ['focus on surface', 'var(--focus)', 'var(--surface)'],
          ['focus on surface-muted', 'var(--focus)', 'var(--surface-muted)']
        ],
        3
      )
    ).toEqual([])
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

  it("hook only the library's own components", () => {
    const sheet = readdirSync(dir)
      .map((file) => read(file))
      .join('\n')
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

  it("gives the buttons antd's heights, type and room", () => {
    const button = rule(css, BUTTON)
    expect(button.get('font-size')).toBe('14px')
    expect(button.get('font-weight')).toBe('400')
    expect(button.get('border')).toBe('1px solid transparent')
    const md = rule(css, `${BUTTON}[data-size='md']`)
    expect(md.get('height')).toBe('32px')
    expect(md.get('padding-inline')).toBe('15px')
    // sm keeps the library's sides, so a caller's px-0 still holds
    const small = rule(css, `${BUTTON}[data-size='sm']`)
    expect(small.get('height')).toBe('24px')
    expect(small.has('padding')).toBe(false)
    expect(small.has('padding-inline')).toBe(false)
  })

  // the fills are the tokens', so a caller's own classes keep working; ghost stays the library's, so the shell's ghost
  // buttons keep their colours on the shell
  it('leaves to the classes what the tokens already draw', () => {
    expect(rules(css).filter((r) => r.selectors.some((s) => s.includes("[data-variant='ghost']") && !s.includes(':not(')))).toEqual([])
    for (const variant of ['primary', 'danger']) expect(rule(css, `${BUTTON}[data-variant='${variant}']`).has('background'), variant).toBe(false)
  })

  it('draws the default button with a grey border, brand on hover', () => {
    expect(rule(css, `${BUTTON}[data-variant='secondary']`).get('border-color')).toBe('var(--border)')
    const hover = rule(css, `${BUTTON}[data-variant='secondary']:hover:not(:disabled)`)
    expect(hover.get('border-color')).toBe('var(--brand)')
    expect(failing([['secondary hovered', hover.get('color')!, hover.get('background')!]])).toEqual([])
  })

  it('marks a disabled button without losing the not-allowed cursor, and leaves the ghost faded', () => {
    const disabled = rule(css, `${BUTTON}:disabled`)
    expect(disabled.get('cursor')).toBe('not-allowed')
    expect(disabled.get('pointer-events')).toBe('auto')
    expect(rule(css, `${BUTTON}:disabled:not([data-variant='ghost'])`).get('opacity')).toBe('1')
  })

  // no padding: the library's sides stay, so a field's own (the search box's pl-8 around its icon) still holds
  it('draws the three fields alike, the input and the select trigger at 32px', () => {
    expect(rule(css, FIELDS).get('font-size')).toBe('14px')
    expect(rules(css).filter((r) => !r.selectors.some((s) => s.startsWith(BUTTON)) && r.declarations.has('padding'))).toEqual([])
    expect(rule(css, ":is([data-slot='input'], [data-slot='select-trigger'])").get('height')).toBe('32px')
    const focus = rule(css, `${FIELDS}:focus`)
    expect(focus.get('border-color')).toBe('var(--focus)')
    expect(focus.get('box-shadow')).toBe('0 0 0 2px rgb(5 145 255 / 10%)')
  })

  it('keeps the danger border of an invalid field, after the hover and the focus', () => {
    const selectors = rules(css).flatMap((r) => r.selectors)
    const invalid = `${FIELDS}[aria-invalid='true']`
    expect(rule(css, invalid).get('border-color')).toBe('var(--danger)')
    expect(selectors.indexOf(invalid)).toBeGreaterThan(selectors.indexOf(`${FIELDS}:focus`))
    expect(selectors.indexOf(invalid)).toBeGreaterThan(selectors.indexOf(`${FIELDS}:hover:not(:disabled)`))
  })
})

describe('display.css', () => {
  const { unlayered: css } = layers(read('display.css'))

  it("draws the card with antd's split and no shadow", () => {
    const card = rule(css, "[data-slot='card']")
    expect(card.get('border-color')).toBe('var(--line)')
    expect(card.get('box-shadow')).toBe('none')
  })

  // the badge's colours stay the caller's (a tone's soft background and text): only the tag's shape is the sheet's
  it("shapes the badge as antd's tag and leaves its colours to the classes", () => {
    const badge = rule(css, "[data-slot='badge']")
    expect(badge.get('border-radius')).toBe('var(--radius-sm)')
    expect(badge.get('font-size')).toBe('12px')
    expect(badge.get('line-height')).toBe('20px')
    expect(badge.has('background')).toBe(false)
    expect(badge.has('color')).toBe(false)
  })
})

describe('tables.css', () => {
  const { unlayered, base: defaults } = layers(read('tables.css'))
  const TABLE = "[data-slot='table']"

  it("draws antd's header", () => {
    const th = rule(unlayered, `${TABLE} th`)
    expect(th.get('padding')).toBe('16px')
    expect(th.get('font-weight')).toBe('600')
    expect(th.get('text-transform')).toBe('none')
    expect(th.get('background-color')).toBe('var(--table-head)')
    expect(rule(unlayered, `${TABLE} th:not(:last-child)::before`).get('height')).toBe('1.6em')
  })

  it('draws the cells over the split', () => {
    const td = rule(unlayered, `${TABLE} td`)
    expect(td.get('padding')).toBe('16px')
    expect(td.get('border-bottom')).toBe('1px solid var(--line)')
  })

  // in the base layer: a row's own class (a selected row's bg-brand-soft) still wins over the hover
  it('draws the row hover and the total as defaults a class overrides', () => {
    expect(rule(defaults, `${TABLE} > tbody > tr:hover`).get('background-color')).toBe('var(--table-head)')
    expect(rule(defaults, `${TABLE} > tfoot td`).get('font-weight')).toBe('600')
    expect(unlayered).not.toMatch(/:hover|tfoot/)
  })

  it('keeps AA over the backgrounds it paints', () => {
    const th = rule(unlayered, `${TABLE} th`)
    const pairs: [string, string, string][] = [
      ['th', th.get('color')!, th.get('background-color')!],
      ...['ink', 'ink-muted', 'link', 'success', 'danger', 'warning'].map((name): [string, string, string] => [
        `${name} on a hovered row`,
        `var(--${name})`,
        'var(--table-head)'
      ])
    ]
    expect(failing(pairs)).toEqual([])
  })
})

describe('tabs.css', () => {
  const { unlayered: css } = layers(read('tabs.css'))
  const TRIGGER = "[data-slot='tabs-trigger']"

  it('draws the ink bar of the active tab over the line', () => {
    expect(rule(css, "[data-slot='tabs-list']").get('border-bottom')).toBe('1px solid var(--line)')
    expect(rule(css, TRIGGER).get('margin-bottom')).toBe('-1px')
    const active = rule(css, `${TRIGGER}[aria-selected='true']`)
    expect(active.get('border-bottom-color')).toBe('var(--brand)')
    expect(active.has('font-weight')).toBe(false)
  })

  it("spaces the tabs as antd's", () => {
    expect(rule(css, "[data-slot='tabs-list']").get('gap')).toBe('32px')
    expect(rule(css, TRIGGER).get('padding')).toBe('12px 0')
  })

  it('keeps AA for the tabs on the page', () => {
    const pairs: [string, string, string][] = [
      ['inactive', rule(css, TRIGGER).get('color')!, 'var(--surface)'],
      ['hovered', rule(css, `${TRIGGER}:hover:not(:disabled)`).get('color')!, 'var(--surface)'],
      ['active', rule(css, `${TRIGGER}[aria-selected='true']`).get('color')!, 'var(--surface)']
    ]
    expect(failing(pairs)).toEqual([])
  })
})

describe('alerts.css', () => {
  const { unlayered: css } = layers(read('alerts.css'))
  const ALERT = "[data-slot='alert']"

  // antd's colorXBorder (no token); the background is the tone's soft token
  it.each([
    ['success', '#b7eb8f'],
    ['warning', '#ffe58f'],
    ['danger', '#ffccc7'],
    ['notice', '#91caff']
  ])('paints %s with its soft background and its border', (tone, border) => {
    const box = rule(css, `${ALERT}[data-tone='${tone}']`)
    expect(box.get('background')).toBe(`var(--${tone}-soft)`)
    expect(box.get('border-color')).toBe(border)
  })

  it("draws the box as antd's", () => {
    const box = rule(css, ALERT)
    expect(box.get('display')).toBe('flex')
    expect(box.get('padding')).toBe('8px 12px')
    expect(box.get('border')).toBe('1px solid')
    expect(box.get('border-radius')).toBe('var(--radius-lg)')
    expect(box.get('color')).toBe('var(--ink)')
  })

  it('keeps the dismiss check at the top right', () => {
    expect(rule(css, "[data-slot='alert-text']").get('flex')).toBe('1')
    expect(rule(css, "[data-slot='alert-dismiss']").get('margin-left')).toBe('0')
  })

  it('keeps AA for the text and the check on every box', () => {
    const color = rule(css, ALERT).get('color')!
    const check = rule(css, "[data-slot='alert-dismiss']").get('color')!
    const pairs = TONES.flatMap((tone): [string, string, string][] => [
      [tone, color, `var(--${tone}-soft)`],
      [`${tone} check`, check, `var(--${tone}-soft)`]
    ])
    expect(failing(pairs)).toEqual([])
  })
})

describe('nav.css', () => {
  const { unlayered: css } = layers(read('nav.css'))
  const TREE = "[data-slot='nav-tree']"
  const part = (selector: string) => rule(css, `${TREE} ${selector}`)
  const CURRENT = "[data-slot='nav-tree-leaf'][aria-current='page']"
  const HOVER = "[data-slot='nav-tree-leaf']:hover"

  it('only styles the tree', () => {
    const selectors = rules(css).flatMap((r) => r.selectors)
    expect(selectors.length).toBeGreaterThan(0)
    expect(selectors.filter((selector) => !selector.startsWith(TREE))).toEqual([])
  })

  it("draws antd's menu items: 8px corners, the brand tint for the current leaf, no side bar", () => {
    expect(part("[data-slot='nav-tree-leaf']").get('border-radius')).toBe('var(--radius-lg)')
    const current = part(CURRENT)
    expect(current.get('color')).toBe('var(--brand)')
    expect(current.get('background-color')).toBe('var(--brand-soft)')
    expect(current.get('border-left-color')).toBe('transparent')
  })

  it('puts the current leaf after the hover', () => {
    const selectors = rules(css).flatMap((r) => r.selectors)
    expect(selectors.indexOf(`${TREE} ${CURRENT}`)).toBeGreaterThan(selectors.indexOf(`${TREE} ${HOVER}`))
  })

  it('keeps AA over the backgrounds it paints', () => {
    const leaf = part("[data-slot='nav-tree-leaf']")
    const hover = part(HOVER)
    const current = part(CURRENT)
    const group = part("[data-slot='nav-tree-group']:hover")
    expect(
      failing([
        ['leaf on the panel', leaf.get('color')!, rule(css, TREE).get('background-color')!],
        ['hovered leaf', leaf.get('color')!, hover.get('background-color')!],
        ['current leaf', current.get('color')!, current.get('background-color')!],
        ['hovered group', group.get('color')!, group.get('background-color')!],
        ['caret on the panel', 'var(--ink-muted)', rule(css, TREE).get('background-color')!]
      ])
    ).toEqual([])
  })
})
