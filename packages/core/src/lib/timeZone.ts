// an IANA name Intl knows ('America/Lima'). the server checks the same with ZoneId.of
export function isTimeZone(timeZone: string): boolean {
  if (!timeZone.trim()) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

export function browserTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone
}
