// ±HH:MM, ±HHMM or ±HH: a fixed offset, no daylight rules (ADR-064)
const OFFSET = /^([+-])(\d{2}):?(\d{2})?$/

// ms east of UTC for a fixed offset, null for a region name. read here, not by Intl: an engine
// before 2024 throws on an offset zone
export function fixedOffset(timeZone: string): number | null {
  const name = timeZone.trim()
  // the server stores Z as +00:00; a config may still say Z
  if (name.toUpperCase() === 'Z') return 0
  const match = OFFSET.exec(name)
  if (!match) return null
  const hours = Number(match[2])
  const minutes = Number(match[3] ?? 0)
  // ZoneOffset.of: ±18:00 at most
  if (minutes > 59 || hours * 60 + minutes > 18 * 60) return null
  return (match[1] === '-' ? -1 : 1) * (hours * 60 + minutes) * 60_000
}

// a zone the server takes (ADR-064): an IANA region name in any case, a fixed offset, or Z
export function isTimeZone(timeZone: string): boolean {
  const name = timeZone.trim()
  if (!name) return false
  if (/^[+-]/.test(name) || name.toUpperCase() === 'Z') return fixedOffset(name) !== null
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
