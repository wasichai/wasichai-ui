import { describe, expect, it } from 'vitest'
import { popupHtml } from './popup'

function render(html: string): HTMLElement {
  const host = document.createElement('div')
  host.innerHTML = html
  return host.firstElementChild as HTMLElement
}

describe('popupHtml', () => {
  it('pins the light theme, so the text stays dark on the white popup in any app theme', () => {
    const root = render(popupHtml({ name: 'Lote 4' }))
    expect(root.dataset.theme).toBe('light')
    expect(root.style.color).toBe('var(--ink)')
  })

  it('colors keys and values from tokens, never a fixed color', () => {
    const html = popupHtml({ name: 'Lote 4' })
    expect(html).toContain('var(--ink-muted)')
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('lists the visible properties and escapes them', () => {
    const root = render(popupHtml({ id: 7, __layer: 'x', name: '<b>Lote</b>', area: null }))
    expect(root.textContent).toBe('name<b>Lote</b>area—')
    expect(root.querySelector('b')).toBeNull()
  })
})
