import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('lets the later tailwind class win a conflict', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4')
  })

  it('drops falsy parts', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})

// without extendCn, an app's own size reads as a colour: the limit #127 lifts on demand, kept here as the default
describe('cn without extendCn', () => {
  it('does not know an app size', () => {
    expect(cn('text-ink', 'text-title-1')).toBe('text-title-1')
    expect(cn('text-sm', 'text-title-1')).toBe('text-sm text-title-1')
  })
})
