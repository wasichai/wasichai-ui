import { describe, expect, it } from 'vitest'
import { ApiError } from '@wasichai/core'
import { answeredTurn, describeError, failedTurn, formatStepInput, formatValue, pendingTurn, replaceTurn, turnStatus } from './transcript'
import type { AgentAnswer } from './types'

const answer: AgentAnswer = {
  answer: 'Hay 12 objetos con geometría.',
  steps: [{ tool: 'list_objects', input: { withGeometry: true }, summary: '12 objetos' }],
  truncated: false
}

describe('turn lifecycle', () => {
  it('starts pending with the trimmed question', () => {
    const turn = pendingTurn('1', '  ¿cuántos objetos hay?  ')

    expect(turn.question).toBe('¿cuántos objetos hay?')
    expect(turnStatus(turn)).toBe('pending')
  })

  it('becomes answered once the answer arrives', () => {
    const turn = answeredTurn(pendingTurn('1', 'hola'), answer)

    expect(turnStatus(turn)).toBe('answered')
    expect(turn.answer?.steps).toHaveLength(1)
    expect(turn.error).toBeNull()
  })

  it('becomes failed and keeps the field violations', () => {
    const cause = new ApiError(400, 'Pregunta inválida', [{ field: 'question', message: 'No puede estar vacía' }])

    const turn = failedTurn(pendingTurn('1', 'hola'), cause)

    expect(turnStatus(turn)).toBe('failed')
    expect(turn.answer).toBeNull()
    expect(turn.error).toEqual({ message: 'Pregunta inválida', violations: ['question: No puede estar vacía'] })
  })

  it('describes anything that is not an ApiError', () => {
    expect(describeError(new Error('network down'))).toEqual({ message: 'network down', violations: [] })
    expect(describeError('boom')).toEqual({ message: 'boom', violations: [] })
  })

  it('replaces only the turn with the same id', () => {
    const first = pendingTurn('1', 'uno')
    const second = pendingTurn('2', 'dos')

    const turns = replaceTurn([first, second], answeredTurn(second, answer))

    expect(turnStatus(turns[0])).toBe('pending')
    expect(turnStatus(turns[1])).toBe('answered')
  })
})

describe('formatStepInput', () => {
  it('yields nothing when the tool took no arguments', () => {
    expect(formatStepInput({})).toEqual([])
    expect(formatStepInput(null)).toEqual([])
  })

  it('turns arguments into readable pairs instead of json', () => {
    expect(formatStepInput({ object: 'predio', limit: 50, geometry: false })).toEqual([
      { name: 'object', value: 'predio' },
      { name: 'limit', value: '50' },
      { name: 'geometry', value: 'false' }
    ])
  })

  it('flattens a nested filter without braces or quotes', () => {
    expect(formatValue({ area: { gt: 1000 }, use: 'comercial' })).toBe('area: gt: 1000, use: comercial')
  })

  it('stops going deeper than two levels', () => {
    expect(formatValue({ a: { b: { c: { d: 1 } } } })).toBe('a: b: …')
  })

  it('lists the first items of an array and counts the rest', () => {
    expect(formatValue(['a', 'b', 'c', 'd', 'e', 'f'])).toBe('a, b, c, d +2')
  })

  it('shows a dash for empty values', () => {
    expect(formatValue(null)).toBe('—')
    expect(formatValue('')).toBe('—')
    expect(formatValue([])).toBe('—')
    expect(formatValue({})).toBe('—')
  })

  it('collapses and truncates a long string', () => {
    const value = formatValue(`${'x'.repeat(90)}\n  tail`)

    expect(value).toHaveLength(81)
    expect(value.endsWith('…')).toBe(true)
  })
})
