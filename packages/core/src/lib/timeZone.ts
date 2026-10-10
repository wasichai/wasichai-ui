// ±HH:MM, ±HHMM or ±HH: a fixed offset, no daylight rules (wasichai/wasichai#99)
const OFFSET = /^([+-])(\d{2}):?(\d{2})?$/

// ms east of UTC for a fixed offset, null for a region name. read here, not by Intl: an engine
// before 2024 throws on an offset zone
export function fixedOffset(timeZone: string): number | null {
  const match = OFFSET.exec(timeZone.trim())
  if (!match) return null
  const hours = Number(match[2])
  const minutes = Number(match[3] ?? 0)
  if (hours > 18 || minutes > 59) return null
  return (match[1] === '-' ? -1 : 1) * (hours * 60 + minutes) * 60_000
}

// a zone the server takes (wasichai/wasichai#99): an IANA region name in any case, or a fixed offset
export function isTimeZone(timeZone: string): boolean {
  const name = timeZone.trim()
  if (!name) return false
  if (/^[+-]/.test(name)) return fixedOffset(name) !== null
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: name })
    return true
  } catch {
    return false
  }
}

export function browserTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone
}
