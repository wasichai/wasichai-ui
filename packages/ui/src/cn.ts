import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge, twMerge } from 'tailwind-merge'

let merge: (classes: string) => string = twMerge

export interface CnExtension {
  // the text-* sizes an app declares in @theme (--text-title-1 → 'title-1'). unknown, twMerge reads them as colours (#127)
  fontSizes?: string[]
}

// once at startup, before the first render. replaces any earlier call; the one cn of the package, so ui's and core's
// components merge the same way
export function extendCn({ fontSizes = [] }: CnExtension) {
  merge = extendTailwindMerge({ extend: { classGroups: { 'font-size': [{ text: fontSizes }] } } })
}

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}
