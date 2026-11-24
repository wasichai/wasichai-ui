import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { AlertTriangle, Archive, BotOff, ChevronDown, Loader2, MessageSquarePlus, SendHorizontal } from 'lucide-react'
import { PageHeader } from '@wasichai/core'
import { Badge, Button, cn, CopyButton } from '@wasichai/ui'
import { useAgentStatus, useArchiveConversation, useConversation, useConversations, useCreateConversation, useSendMessage, useUpdateAgentSettings } from './api'
import { Markdown } from './Markdown'
import {
  elapsed,
  failedTurn,
  formatStepInput,
  groupOf,
  pendingTurn,
  titleOf,
  turnStatus,
  turnsFromMessages,
  type ConversationGroup,
  type Turn
} from './transcript'
import type { AgentConversation } from './types'

// the open conversation lives in the url: a reload, a link or the back button finds it again
const CONVERSATION_PARAM = 'c'
const GROUPS: ConversationGroup[] = ['today', 'yesterday', 'week', 'earlier']
// the composer grows with the question up to this many lines, then scrolls
const MAX_ROWS = 8

export interface AssistantPageProps {
  // the questions offered on an empty conversation; the platform's generic ones by default
  suggestions?: string[]
  // the line under the title; the platform's by default
  scope?: string
  // the composer's hint; the platform's by default
  placeholder?: string
}

/**
 * The assistant as a consultation record, not a chat: each turn is the question, set as a heading line, and the
 * answer below it at a reading measure, closed by where its figures came from. The user's conversations sit in a side
 * list by day; the server keeps them (ADR-087). The conversation itself is [AssistantConversation], which an app can
 * also show elsewhere (a floating panel).
 */
export function AssistantPage({ suggestions, scope, placeholder }: AssistantPageProps = {}) {
  const { t } = useTranslation('agent')
  const status = useAgentStatus()
  const [params, setParams] = useSearchParams()
  const conversationId = params.get(CONVERSATION_PARAM)
  // missing endpoint counts as off: the page still renders, the input does not.
  const enabled = status.data?.enabled === true
  const conversations = useConversations(enabled)
  const archive = useArchiveConversation()

  const select = (id: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (id) next.set(CONVERSATION_PARAM, id)
        else next.delete(CONVERSATION_PARAM)
        return next
      },
      { replace: id === null }
    )

  return (
    <>
      <PageHeader title={t('assistant.title')} subtitle={scope ?? t('assistant.scope')} actions={enabled ? <ModelPicker /> : null} />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-x-8 gap-y-4 px-4 py-6 md:px-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <ConversationList
          conversations={conversations.data ?? []}
          current={conversationId}
          canStart={conversationId !== null}
          onOpen={select}
          onArchive={async (id) => {
            await archive.mutateAsync(id)
            if (id === conversationId) select(null)
          }}
        />

        <section className="flex min-h-[calc(100dvh-14rem)] min-w-0 flex-col" aria-label={t('assistant.title')}>
          <AssistantConversation conversationId={conversationId} onConversation={select} suggestions={suggestions} placeholder={placeholder} />
        </section>
      </div>
    </>
  )
}

export interface AssistantConversationProps {
  // the conversation shown; null starts a new one with the first question
  conversationId: string | null
  // told the id of the conversation the first question opened
  onConversation: (id: string) => void
  suggestions?: string[]
  placeholder?: string
  // a narrow place (a floating panel): the transcript scrolls inside it, suggestions in one column
  compact?: boolean
}

/**
 * One conversation: its turns, as the server keeps them plus the one being asked, and the composer. Asking with no
 * conversation opens one, named after the question, and tells [AssistantConversationProps.onConversation].
 */
export function AssistantConversation({ conversationId, onConversation, suggestions: own, placeholder, compact = false }: AssistantConversationProps) {
  // the assistant's strings live in its own namespace; common.loading stays core's
  const { t } = useTranslation(['agent', 'common'])
  const status = useAgentStatus()
  const enabled = status.data?.enabled === true
  const conversation = useConversation(conversationId)
  const create = useCreateConversation()
  const send = useSendMessage()
  // the turns the server does not have: the one being asked, and the ones that failed (the server keeps nothing of them)
  const [local, setLocal] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const nextId = useRef(0)
  const end = useRef<HTMLDivElement>(null)
  // the conversation this component opened itself: following it keeps the turn being asked
  const opened = useRef<string | null>(null)

  // another conversation drops what was only on this page
  const [shown, setShown] = useState(conversationId)
  if (shown !== conversationId) {
    setShown(conversationId)
    if (conversationId === null || conversationId !== opened.current) setLocal([])
  }

  const stored = useMemo(() => turnsFromMessages(conversation.data?.messages ?? []), [conversation.data])
  const turns = [...stored, ...local]
  const pending = local.some((turn) => turnStatus(turn) === 'pending')
  const suggestions = own ?? [t('assistant.suggestionObjects'), t('assistant.suggestionRecords'), t('assistant.suggestionGeometry')]

  useEffect(() => {
    // jsdom has no scrollIntoView
    end.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [turns.length])

  const ask = async (text: string) => {
    if (!text || !enabled || pending) return
    const turn = pendingTurn(`local-${nextId.current++}`, text)
    setLocal((current) => [...current, turn])
    setQuestion('')
    try {
      // the first question opens a conversation, named after it at once (a side list shows it while the answer comes)
      let id = conversationId
      if (id === null) {
        id = (await create.mutateAsync(titleOf(text))).id
        opened.current = id
        onConversation(id)
      }
      await send.mutateAsync({ conversationId: id, question: text })
      // refetched by the mutation: the server's copy replaces ours
      setLocal((current) => current.filter((item) => item.id !== turn.id))
    } catch (cause) {
      // a failed turn stays in the transcript. a toast would take the evidence with it.
      setLocal((current) => [...current.filter((item) => item.id !== turn.id), failedTurn(turn, cause)])
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void ask(question.trim())
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={cn('flex-1', compact && 'min-h-0 overflow-y-auto px-4 pt-3')}>
        {status.isLoading ? <p className="text-sm text-ink-muted">{t('common.loading')}</p> : enabled ? null : <Disabled />}

        {conversation.isError ? (
          <p className="mb-4 text-sm text-danger" role="alert">
            {t('assistant.conversationMissing')}
          </p>
        ) : null}

        {turns.length === 0 ? (
          <Empty suggestions={suggestions} disabled={!enabled} onPick={(text) => void ask(text)} compact={compact} />
        ) : (
          <ol data-testid="assistant-transcript" className="max-w-5xl divide-y divide-line">
            {turns.map((turn) => (
              <TurnView key={turn.id} turn={turn} compact={compact} />
            ))}
          </ol>
        )}
        <div ref={end} />
      </div>

      <Composer value={question} onChange={setQuestion} onSubmit={submit} disabled={!enabled} pending={pending} placeholder={placeholder} compact={compact} />
    </div>
  )
}

function Disabled() {
  const { t } = useTranslation('agent')
  return (
    <div role="status" className="mb-6 flex max-w-3xl items-start gap-3 rounded-md border border-border bg-surface-muted px-4 py-3">
      <BotOff className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
      <div>
        <p className="text-sm font-semibold text-ink">{t('assistant.disabled')}</p>
        <p className="text-sm text-ink-muted">{t('assistant.disabledHint')}</p>
      </div>
    </div>
  )
}

// an empty conversation is an invitation to ask: the app's own questions, sent as they are with one click
function Empty({ suggestions, disabled, onPick, compact }: { suggestions: string[]; disabled: boolean; onPick: (text: string) => void; compact: boolean }) {
  const { t } = useTranslation('agent')
  return (
    <div className={cn('max-w-3xl', compact ? 'py-2' : 'py-6')}>
      <h2 className={cn('font-semibold text-ink', compact ? 'text-base' : 'text-xl')}>{t('assistant.emptyTitle')}</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t('assistant.emptyHint')}</p>
      <ul className={cn('grid gap-2', compact ? 'mt-4' : 'mt-6 sm:grid-cols-2')}>
        {suggestions.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(suggestion)}
              className="h-full w-full rounded-md border border-border bg-surface px-4 py-3 text-left text-sm text-ink hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ConversationList({
  conversations,
  current,
  canStart,
  onOpen,
  onArchive
}: {
  conversations: AgentConversation[]
  current: string | null
  canStart: boolean
  onOpen: (id: string | null) => void
  onArchive: (id: string) => void
}) {
  const { t } = useTranslation('agent')
  const groups = useMemo(() => {
    const now = new Date()
    return GROUPS.map((group) => ({ group, items: conversations.filter((item) => groupOf(item.updatedAt, now) === group) })).filter(
      ({ items }) => items.length > 0
    )
  }, [conversations])

  return (
    <nav aria-label={t('assistant.conversations')} className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-10rem)] lg:self-start lg:overflow-y-auto">
      <Button type="button" variant="secondary" className="w-full justify-start" onClick={() => onOpen(null)} disabled={!canStart}>
        <MessageSquarePlus className="h-4 w-4" />
        {t('assistant.newConversation')}
      </Button>
      {groups.length === 0 ? (
        <p className="mt-4 px-1 text-sm text-ink-muted">{t('assistant.noConversations')}</p>
      ) : (
        <div data-testid="conversation-list" className="mt-4 space-y-4">
          {groups.map(({ group, items }) => (
            <section key={group}>
              <h2 className="px-2 pb-1 text-xs font-semibold text-ink-muted">{t(`assistant.groups.${group}`)}</h2>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const title = item.title ?? t('assistant.untitled')
                  const selected = item.id === current
                  return (
                    <li key={item.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onOpen(item.id)}
                        aria-current={selected ? 'page' : undefined}
                        title={title}
                        className={cn(
                          'w-full truncate rounded-md border-l-2 py-1.5 pr-8 pl-2.5 text-left text-sm',
                          selected ? 'border-brand bg-brand-soft font-semibold text-brand-strong' : 'border-transparent text-ink hover:bg-surface-muted'
                        )}
                      >
                        {title}
                      </button>
                      <button
                        type="button"
                        aria-label={t('assistant.archive', { title })}
                        title={t('assistant.archiveShort')}
                        onClick={() => onArchive(item.id)}
                        className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1 text-ink-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-surface hover:text-ink focus-visible:opacity-100"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </nav>
  )
}

function TurnView({ turn, compact }: { turn: Turn; compact: boolean }) {
  const { t } = useTranslation('agent')
  const state = turnStatus(turn)

  return (
    <li className={cn('first:pt-2', compact ? 'py-4' : 'py-6')}>
      {/* the question heads its answer: a thin brand rule marks who asked */}
      <p className="max-w-[75ch] border-l-2 border-brand pl-3 text-base font-semibold whitespace-pre-wrap text-ink">{turn.question}</p>

      <div className="mt-3 pl-3.5">
        {state === 'pending' ? <Waiting /> : null}

        {state === 'failed' && turn.error ? (
          <div data-testid="turn-failed" className="flex items-start gap-3 rounded-md border border-danger bg-danger-soft px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-semibold text-ink">{t('assistant.failed')}</p>
              <p className="text-sm text-ink-muted">{turn.error.message}</p>
              {turn.error.violations.length > 0 ? (
                <ul className="mt-1 list-disc pl-4 text-xs text-ink-muted">
                  {turn.error.violations.map((violation) => (
                    <li key={violation}>{violation}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        {state === 'answered' && turn.answer ? (
          <div data-testid="turn-answer">
            {turn.answer.truncated ? (
              <div
                className="mb-3 flex items-start gap-2 rounded-md border border-warning bg-warning-soft px-3 py-2"
                role="alert"
                data-testid="truncated-warning"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-semibold text-ink">{t('assistant.truncated')}</p>
                  <p className="text-xs text-ink-muted">{t('assistant.truncatedHint')}</p>
                </div>
              </div>
            ) : null}
            <Markdown>{turn.answer.answer}</Markdown>
            <Provenance turn={turn} />
          </div>
        ) : null}
      </div>
    </li>
  )
}

// the answer takes minutes when it reads a whole brecha: the time says it is still at work
function Waiting() {
  const { t } = useTranslation('agent')
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(() => setSeconds((Date.now() - started) / 1000), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <p className="flex items-center gap-2 text-sm text-ink-muted" role="status" data-testid="turn-pending">
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      {t('assistant.thinking')}
      <span className="tabular-nums">{elapsed(seconds)}</span>
    </p>
  )
}

// where the figures came from, in the words of each tool's summary; the arguments on demand. the model that wrote it
// and the copy of the answer close the line
function Provenance({ turn }: { turn: Turn }) {
  const { t } = useTranslation('agent')
  const [open, setOpen] = useState(false)
  const answer = turn.answer!
  const steps = answer.steps

  return (
    <div className="mt-4 border-t border-line pt-2 text-xs text-ink-muted">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {steps.length === 0 ? (
          <span>{t('assistant.noSteps')}</span>
        ) : (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`steps-${turn.id}`}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex min-w-0 items-center gap-1 rounded text-left hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none', open ? 'rotate-0' : '-rotate-90')} />
            <span className="font-semibold text-ink">{t('assistant.source')}</span>
            <span className="truncate">{steps.map((step) => step.summary).join('; ')}</span>
          </button>
        )}
        <span className="ml-auto flex items-center gap-2">
          {answer.model ? <span>{answer.model}</span> : null}
          <CopyButton value={answer.answer} label={t('assistant.copy')} copiedLabel={t('assistant.copied')} className="h-7 w-7" />
        </span>
      </div>
      {open ? (
        <ol id={`steps-${turn.id}`} data-testid="turn-steps" className="mt-2 space-y-2 border-l border-border pl-4">
          {steps.map((step, index) => (
            <li key={`${step.tool}-${index}`} className="space-y-0.5">
              <p className="font-mono font-semibold text-ink">{step.tool}</p>
              {formatStepInput(step.input).length === 0 ? (
                <p>{t('assistant.noArguments')}</p>
              ) : (
                <dl className="space-y-0.5">
                  {formatStepInput(step.input).map((argument) => (
                    <div key={argument.name} className="flex gap-2">
                      <dt className="shrink-0 font-medium">{argument.name}</dt>
                      <dd className="font-mono text-ink">{argument.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p>{step.summary}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}

// a question can be long and have lines: enter sends, shift+enter breaks the line
function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  pending,
  placeholder,
  compact
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  disabled: boolean
  pending: boolean
  placeholder?: string
  compact: boolean
}) {
  const { t } = useTranslation('agent')
  const area = useRef<HTMLTextAreaElement>(null)
  const hint = placeholder ?? t('assistant.placeholder')

  useEffect(() => {
    const element = area.current
    if (!element) return
    element.style.height = 'auto'
    const line = parseFloat(getComputedStyle(element).lineHeight) || 20
    element.style.height = `${Math.min(element.scrollHeight, line * MAX_ROWS + 16)}px`
  }, [value])

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(compact ? 'border-t border-line bg-surface px-3 pt-2 pb-3' : 'sticky -bottom-6 mt-4 max-w-5xl bg-surface-muted pt-2 pb-10')}
    >
      <div className="flex items-end gap-2 rounded-lg border border-border-control bg-surface p-2 focus-within:border-brand">
        <textarea
          ref={area}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled || pending}
          placeholder={hint}
          aria-label={hint}
          className="max-h-60 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink outline-none placeholder:text-placeholder disabled:cursor-not-allowed"
        />
        <Button type="submit" disabled={disabled || pending || value.trim() === ''} aria-label={pending ? t('assistant.sending') : t('assistant.send')}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <SendHorizontal className="h-4 w-4" />}
          <span className="max-sm:sr-only">{pending ? t('assistant.sending') : t('assistant.send')}</span>
        </Button>
      </div>
      {compact ? null : <p className="mt-1.5 px-1 text-xs text-ink-muted">{t('assistant.composerHint')}</p>}
    </form>
  )
}

// the user's own model, from the app's list (ADR-087). one model on offer: a badge, nothing to pick.
export function ModelPicker() {
  const { t } = useTranslation('agent')
  const status = useAgentStatus()
  const update = useUpdateAgentSettings()
  const models = status.data?.models ?? []
  const current = status.data?.model
  if (!current) return null
  if (models.length < 2) {
    return (
      <Badge>
        {t('assistant.model')}: {current}
      </Badge>
    )
  }
  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      {t('assistant.model')}
      <select
        value={current}
        disabled={update.isPending}
        onChange={(event) => update.mutate(event.target.value === models[0] ? null : event.target.value)}
        className="h-9 rounded-md border border-border-control bg-surface px-2 text-sm text-ink"
      >
        {models.map((model, index) => (
          <option key={model} value={model}>
            {index === 0 ? t('assistant.defaultModel', { model }) : model}
          </option>
        ))}
      </select>
    </label>
  )
}
