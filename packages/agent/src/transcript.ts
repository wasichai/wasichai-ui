import { ApiError } from '@wasichai/core'
import type { AgentAnswer } from './types'

export type TurnStatus = 'pending' | 'answered' | 'failed'

export interface TurnError {
  message: string
  violations: string[]
}

// one question and whatever came back. the transcript lives in the page, the server keeps no session.
export interface Turn {
  id: string
  question: string
  answer: AgentAnswer | null
  error: TurnError | null
}

export interface StepArgument {
  name: string
  value: string
}

const MAX_TEXT = 80
const MAX_ITEMS = 4
const MAX_DEPTH = 2
const EMPTY = '—'

export function pendingTurn(id: string, question: string): Turn {
  return { id, question: question.trim(), answer: null, error: null }
}

export function answeredTurn(turn: Turn, answer: AgentAnswer): Turn {
  return { ...turn, answer, error: null }
}

export function failedTurn(turn: Turn, cause: unknown): Turn {
  return { ...turn, answer: null, error: describeError(cause) }
}

// no flags to keep in sync: the shape of the turn is the status.
export function turnStatus(turn: Turn): TurnStatus {
  if (turn.error) return 'failed'
  return turn.answer ? 'answered' : 'pending'
}

export function replaceTurn(turns: Turn[], next: Turn): Turn[] {
  return turns.map((turn) => (turn.id === next.id ? next : turn))
}

export function describeError(cause: unknown): TurnError {
  if (cause instanceof ApiError) {
    return { message: cause.message, violations: cause.violations.map((violation) => `${violation.field}: ${violation.message}`) }
  }
  if (cause instanceof Error) return { message: cause.message, violations: [] }
  return { message: String(cause), violations: [] }
}

// tool arguments as label/value pairs. raw json is provenance nobody reads.
export function formatStepInput(input: Record<string, unknown> | null | undefined): StepArgument[] {
  if (!input) return []
  return Object.entries(input).map(([name, value]) => ({ name, value: formatValue(value) }))
}

export function formatValue(value: unknown, depth = 0): string {
  if (value === null || value === undefined || value === '') return EMPTY
  if (typeof value === 'string') return truncate(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value))
    return joinParts(
      value.map((item) => () => formatValue(item, depth + 1)),
      depth
    )
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return joinParts(
      entries.map(
        ([name, nested]) =>
          () =>
            `${name}: ${formatValue(nested, depth + 1)}`
      ),
      depth
    )
  }
  return String(value)
}

// deep enough is deep enough: nobody checks provenance three levels down.
function joinParts(parts: (() => string)[], depth: number): string {
  if (parts.length === 0) return EMPTY
  if (depth >= MAX_DEPTH) return '…'
  const shown = parts.slice(0, MAX_ITEMS).map((part) => part())
  const rest = parts.length - shown.length
  return rest > 0 ? `${shown.join(', ')} +${rest}` : shown.join(', ')
}

function truncate(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean === '') return EMPTY
  return clean.length > MAX_TEXT ? `${clean.slice(0, MAX_TEXT)}…` : clean
}
