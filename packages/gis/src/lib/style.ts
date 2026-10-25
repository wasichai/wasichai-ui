import type { ExpressionSpecification } from 'maplibre-gl'

// colour by one attribute. the server computes the classes (POST /gis/objects/{o}/style-classes) so the map, its
// legend and the published WMS show the same ones. lives here (not in MapView) so it is testable without maplibre.
export type StyleType = 'categories' | 'quantiles'

export interface AttributeStyle {
  by: string
  type: StyleType
  classes?: number
  palette?: string[]
}

// a category has a value; a quantile a [min, max) range, the last one closed
export interface StyleClass {
  label: string
  color: string
  value?: string | number | boolean
  min?: number
  max?: number
}

export interface StyleClasses {
  by: string
  type: StyleType
  classes: StyleClass[]
}

// what MapView paints: a colour or a maplibre expression for fill, line and circle, and an optional line offset
export interface FeatureStyle {
  color?: string | ExpressionSpecification
  lineOffset?: number
}

export interface LegendItem {
  label: string
  color: string
}

// what the SLD paints a feature no class matches
export const OTHER_COLOR = '#9e9e9e'
export const DEFAULT_CLASSES = 5
export const MIN_CLASSES = 2
export const MAX_CLASSES = 9

const NUMERIC = new Set(['INTEGER', 'DECIMAL'])
const CATEGORICAL = new Set(['ENUM', 'TEXT', 'BOOLEAN'])

// the types a field must have for each kind of style, the same rule the server checks
export function styleTypeFor(fieldType: string): StyleType | null {
  if (NUMERIC.has(fieldType)) return 'quantiles'
  if (CATEGORICAL.has(fieldType)) return 'categories'
  return null
}

// match labels must be strings or numbers: compare as text so a boolean or a number category still matches
export function colorExpression(styled: StyleClasses): string | ExpressionSpecification {
  const { by, type, classes } = styled
  if (classes.length === 0) return OTHER_COLOR
  if (type === 'categories') {
    const pairs = classes.flatMap((item) => [String(item.value ?? item.label), item.color])
    return ['match', ['to-string', ['get', by]], ...pairs, OTHER_COLOR] as unknown as ExpressionSpecification
  }
  // step: below the first min and missing values are grey, then each class from its min up
  const steps = classes.flatMap((item) => [item.min ?? 0, item.color])
  return ['case', ['==', ['typeof', ['get', by]], 'number'], ['step', ['get', by], OTHER_COLOR, ...steps], OTHER_COLOR] as unknown as ExpressionSpecification
}

export function legendItems(styled: StyleClasses | null | undefined): LegendItem[] {
  return (styled?.classes ?? []).map((item) => ({ label: item.label, color: item.color }))
}

export function featureStyleOf(styled: StyleClasses | null | undefined): FeatureStyle | undefined {
  return styled ? { color: colorExpression(styled) } : undefined
}

// the style as url params and back, so a styled map is a link like any other
export function styleFromParams(params: URLSearchParams): AttributeStyle | null {
  const by = params.get('by')
  const type = params.get('type')
  if (!by || (type !== 'categories' && type !== 'quantiles')) return null
  const classes = Number(params.get('classes'))
  return type === 'quantiles' && Number.isInteger(classes) && classes >= MIN_CLASSES && classes <= MAX_CLASSES ? { by, type, classes } : { by, type }
}

export function styleParams(style: AttributeStyle | null): Record<string, string> {
  if (!style) return {}
  return style.classes ? { by: style.by, type: style.type, classes: String(style.classes) } : { by: style.by, type: style.type }
}
