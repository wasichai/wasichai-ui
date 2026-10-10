import { describe, expect, it } from 'vitest'
import { CHANGE_REASON_HEADER, CHANGE_REASON_MAX_LENGTH, changeReasonHeader, normalizeReason, reasonProblem } from './changeReason'

describe('changeReasonHeader', () => {
  it('sends nothing for no reason', () => {
    expect(changeReasonHeader(undefined)).toEqual({})
    expect(changeReasonHeader(null)).toEqual({})
    expect(changeReasonHeader('   \n ')).toEqual({})
  })

  it('percent-encodes the trimmed reason in the RFC 8187 form', () => {
    expect(changeReasonHeader('  corrección del monto ')).toEqual({ 'X-Change-Reason': "UTF-8''correcci%C3%B3n%20del%20monto" })
  })

  it('keeps a percent sign literal and line breaks as text', () => {
    expect(changeReasonHeader('10% de descuento\nok')).toEqual({ 'X-Change-Reason': "UTF-8''10%25%20de%20descuento%0Aok" })
  })

  it('never throws on a lone surrogate', () => {
    expect(changeReasonHeader('a\uD800b')).toEqual({ 'X-Change-Reason': "UTF-8''a%EF%BF%BDb" })
    expect(changeReasonHeader('a\uDC00')).toEqual({ 'X-Change-Reason': "UTF-8''a%EF%BF%BD" })
  })

  it('is ascii only, so fetch accepts it', () => {
    expect(changeReasonHeader('motivo 😀 ñ')['X-Change-Reason']).toMatch(/^[\x20-\x7E]+$/)
    expect(() => new Headers(changeReasonHeader('corrección\nmonto 😀'))).not.toThrow()
  })

  it('names the header and the limit like the server', () => {
    expect(CHANGE_REASON_HEADER).toBe('X-Change-Reason')
    expect(CHANGE_REASON_MAX_LENGTH).toBe(500)
  })
})

describe('normalizeReason', () => {
  it('trims, and a blank reason is no reason', () => {
    expect(normalizeReason('  ok \n')).toBe('ok')
    expect(normalizeReason(' \t ')).toBeNull()
    expect(normalizeReason(undefined)).toBeNull()
    expect(normalizeReason(null)).toBeNull()
  })
})

describe('reasonProblem', () => {
  it('asks for one when blank', () => {
    expect(reasonProblem('  ')).toBe('REQUIRED')
    expect(reasonProblem(undefined)).toBe('REQUIRED')
  })

  it('counts code points, not utf-16 units', () => {
    expect(reasonProblem('😀'.repeat(500))).toBeNull()
    expect(reasonProblem('😀'.repeat(501))).toBe('TOO_LONG')
    expect(reasonProblem('a'.repeat(501))).toBe('TOO_LONG')
  })

  it('measures the trimmed reason', () => expect(reasonProblem(`  ${'a'.repeat(500)}  `)).toBeNull())

  it('refuses control characters but not tab or line breaks', () => {
    expect(reasonProblem('a\u0000b')).toBe('CONTROL')
    expect(reasonProblem('a\u000Bb')).toBe('CONTROL')
    expect(reasonProblem('a\u001Fb')).toBe('CONTROL')
    expect(reasonProblem('a\u007Fb')).toBe('CONTROL')
    expect(reasonProblem('a\u009Fb')).toBe('CONTROL')
    expect(reasonProblem('línea 1\r\n\tlínea 2')).toBeNull()
  })
})
