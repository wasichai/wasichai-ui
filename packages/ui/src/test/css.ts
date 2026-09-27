// helpers for the theme tests: read a css rule and measure a contrast, without a css parser

// the declarations of the first rule whose selector list has `selector` (innermost rules, so `@layer` wrappers are skipped)
export function rule(css: string, selector: string): Map<string, string> {
  for (const { selectors, declarations } of rules(css)) if (selectors.includes(selector)) return declarations
  throw new Error(`no rule for ${selector}`)
}

// every innermost rule: its selectors (trimmed, one line each) and its declarations
export function rules(css: string): { selectors: string[]; declarations: Map<string, string> }[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
    selectors: splitTop(selectors.replace(/^[\s\S]*;/, '')).map((part) => part.trim().replace(/\s+/g, ' ')),
    declarations: new Map(
      body.split(';').flatMap((declaration) => {
        const colon = declaration.indexOf(':')
        return colon < 0 ? [] : [[declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()] as const]
      })
    )
  }))
}

// the outermost blocks of a sheet (an @scope, an @layer, a plain rule): prelude and body, comments and @imports dropped
export function blocks(css: string): { prelude: string; body: string }[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '')
  const found: { prelude: string; body: string }[] = []
  let depth = 0
  let start = 0
  let open = 0
  for (let index = 0; index < clean.length; index++) {
    if (clean[index] === '{' && depth++ === 0) open = index
    else if (clean[index] === '}' && --depth === 0) {
      found.push({ prelude: clean.slice(start, open).trim().replace(/\s+/g, ' '), body: clean.slice(open + 1, index) })
      start = index + 1
    }
  }
  return found
}

// a token's value with its var() aliases followed (link: var(--brand) -> brand's value)
export function resolveVar(tokens: Map<string, string>, name: string): string {
  const value = tokens.get(`--${name}`)
  if (value === undefined) throw new Error(`no --${name}`)
  const alias = /^var\(--([a-z-]+)\)$/.exec(value)
  return alias ? resolveVar(tokens, alias[1]) : value
}

// a selector list by its commas, not the ones inside :is(…) or :not(…)
function splitTop(list: string): string[] {
  const parts = ['']
  let depth = 0
  for (const char of list) {
    depth += char === '(' ? 1 : char === ')' ? -1 : 0
    if (char === ',' && depth === 0) parts.push('')
    else parts[parts.length - 1] += char
  }
  return parts
}

// oklch -> oklab -> linear srgb (css color 4), clipped to the gamut
function oklchToLinear(lightness: number, chroma: number, hue: number): number[] {
  const a = chroma * Math.cos((hue * Math.PI) / 180)
  const b = chroma * Math.sin((hue * Math.PI) / 180)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ].map((channel) => Math.min(1, Math.max(0, channel)))
}

// #rgb, #rrggbb, rgb(r g b) / rgb(r, g, b) or oklch(l% c h), as linear 0-1 channels
function linear(color: string): number[] {
  const oklch = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/i.exec(color)
  if (oklch) return oklchToLinear(Number(oklch[1]) / 100, Number(oklch[2]), Number(oklch[3]))
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)
  const rgb = /^rgb\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*\)$/i.exec(color)
  let channels: number[]
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((digit) => digit + digit).join('') : hex[1]
    channels = [0, 2, 4].map((start) => parseInt(digits.slice(start, start + 2), 16))
  } else if (rgb) channels = rgb.slice(1, 4).map(Number)
  else throw new Error(`not a plain color: ${color}`)
  return channels.map((channel) => channel / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
}

// WCAG 2.x relative luminance and contrast ratio
function luminance(color: string): number {
  const [r, g, b] = linear(color)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
