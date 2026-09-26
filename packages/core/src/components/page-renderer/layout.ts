import type { CSSProperties } from 'react'
import type { PageTemplate } from '../../types/metadata'

// the canvas, the renderer and the preview all lay a template's rows out. if they disagree the
// canvas shows a page the renderer never draws, so the layout is written down exactly once.
export const ROW_CLASS = 'flex flex-col gap-3 lg:flex-row'

// tailwind cannot generate a width from a runtime value, so spans go through style, never a class
export function regionStyle(span: number): CSSProperties {
  return { flexGrow: span, flexBasis: 0 }
}

export function regionKeys(template: PageTemplate): string[] {
  return template.rows.flatMap((row) => row.regions.map((region) => region.name))
}
