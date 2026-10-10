import { describe, expect, it } from 'vitest'
import { fixedOffset, isTimeZone } from './timeZone'

// what the server takes as a field's zone, answered before the round trip
describe('isTimeZone', () => {
  it('takes an IANA region name in any case, an alias and UTC', () => {
    for (const name of ['America/Lima', 'america/lima', ' Europe/Madrid ', 'US/Pacific', 'Etc/GMT+5', 'UTC']) expect(isTimeZone(name), name).toBe(true)
  })

  it('takes a fixed offset', () => {
    for (const name of ['+05:00', '-05:00', '-0500', '+05', '+18:00', 'Z']) expect(isTimeZone(name), name).toBe(true)
  })

  it('refuses a typo, a prefixed offset, seconds and a blank', () => {
    for (const name of ['America/Limaa', 'GMT+5', 'UTC-5', '+05:00:30', '+18:30', '+25:00', '', ' ']) expect(isTimeZone(name), name).toBe(false)
  })
})

describe('fixedOffset', () => {
  it('reads an offset in ms east of utc, and nothing else', () => {
    expect(fixedOffset('-05:00')).toBe(-5 * 3_600_000)
    expect(fixedOffset('+0530')).toBe(5.5 * 3_600_000)
    expect(fixedOffset('z')).toBe(0)
    expect(fixedOffset('America/Lima')).toBeNull()
  })
})
