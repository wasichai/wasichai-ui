import { ApiError } from '@wasichai/core'
import type { AgentAnswer, AgentMessage } from './types'

export type TurnStatus = 'pending' | 'answered' | 'failed'

export interface TurnError {
  message: string
  violations: string[]
}

// one question and whatever came back. kept by the server once answered (ADR-087); pending and failed ones live in the page.
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

// the server's messages as turns: each question with the answer after it. an unanswered question (a run
// still going elsewhere) shows as pending.
export function turnsFromMessages(messages: AgentMessage[]): Turn[] {
  const turns: Turn[] = []
  messages.forEach((message) => {
    if (message.role === 'USER') {
      turns.push(pendingTurn(message.id, message.content))
      return
    }
    const last = turns[turns.length - 1]
    const answer: AgentAnswer = {
      answer: message.content,
      steps: message.steps ?? [],
      truncated: message.truncated,
      ...(message.usage ? { usage: message.usage } : {}),
      model: message.model
    }
    if (last && last.answer === null && last.error === null) turns[turns.length - 1] = answeredTurn(last, answer)
  })
  return turns
}

export type ConversationGroup = 'today' | 'yesterday' | 'week' | 'earlier'

// the side list's sections, by the day of the last answer in the user's own time zone
export function groupOf(updatedAt: string, now: Date = new Date()): ConversationGroup {
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((day(now) - day(new Date(updatedAt))) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return 'week'
  return 'earlier'
}

// m:ss, for the wait of an answer that can take minutes
export function elapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const TITLE_LENGTH = 80

// a new conversation's name: the first line of its first question, cut at a word (as the server would name it)
export function titleOf(question: string): string {
  const line = question.trim().split('\n')[0].trim()
  if (line.length <= TITLE_LENGTH) return line
  const cut = line.slice(0, TITLE_LENGTH)
  const space = cut.lastIndexOf(' ')
  return (space > 0 ? cut.slice(0, space) : cut).trimEnd() + '…'
}
