// the feature popup's html. lives here (not in MapView) so it can be tested without loading maplibre in jsdom.
// the map area stays light like the basemap: maplibre paints the popup white, so pin the light theme
// or a dark app theme's near-white ink would vanish on it.

export function popupHtml(properties: Record<string, unknown>): string {
  const rows = Object.entries(properties)
    .filter(([key]) => !key.startsWith('__') && key !== 'id')
    .map(
      ([key, value]) =>
        `<div style="display:flex;gap:8px"><span style="color:var(--ink-muted)">${escapeHtml(key)}</span>` +
        `<span>${escapeHtml(value == null ? '—' : String(value))}</span></div>`
    )
    .join('')
  return `<div data-theme="light" style="color:var(--ink);font:12px/1.5 ui-sans-serif,system-ui">${rows}</div>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}
