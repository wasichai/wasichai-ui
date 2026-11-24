import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { AlertTriangle, Archive, BotOff, Loader2, Plus, Send, ShieldCheck, Wrench } from 'lucide-react'
import { PageHeader } from '@wasichai/core'
import { Badge, Button, Card, CardBody, cn, Input } from '@wasichai/ui'
import { useAgentStatus, useArchiveConversation, useConversation, useConversations, useCreateConversation, useSendMessage, useUpdateAgentSettings } from './api'
import { failedTurn, formatStepInput, pendingTurn, turnStatus, turnsFromMessages, type Turn } from './transcript'

// the open conversation lives in the url: a reload, a link or the back button finds it again
const CONVERSATION_PARAM = 'c'

export interface AssistantPageProps {
  // the questions offered on an empty conversation; the platform's generic ones by default
  suggestions?: string[]
  // the line under the title; the platform's by default
  scope?: string
}

export function AssistantPage({ suggestions: own, scope }: AssistantPageProps = {}) {
  // the assistant's strings live in its own namespace; common.loading stays core's
  const { t } = useTranslation(['agent', 'common'])
  const status = useAgentStatus()
  const [params, setParams] = useSearchParams()
  const conversationId = params.get(CONVERSATION_PARAM)
  // missing endpoint counts as off: the page still renders, the input does not.
  const enabled = status.data?.enabled === true
  const conversations = useConversations(enabled)
  const conversation = useConversation(conversationId)
  const create = useCreateConversation()
  const send = useSendMessage()
  const archive = useArchiveConversation()
  // the turns the server does not have: the one being asked, and the ones that failed (the server keeps nothing of them)
  const [local, setLocal] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const nextId = useRef(0)
  const end = useRef<HTMLDivElement>(null)

  const stored = useMemo(() => turnsFromMessages(conversation.data?.messages ?? []), [conversation.data])
  const turns = [...stored, ...local]
  const pending = local.some((turn) => turnStatus(turn) === 'pending')
  const suggestions = own ?? [t('assistant.suggestionObjects'), t('assistant.suggestionRecords'), t('assistant.suggestionGeometry')]

  useEffect(() => {
    // jsdom has no scrollIntoView
    end.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [turns.length])

  // switching conversations drops what was only on this page
  const open = (id: string | null) => {
    setLocal([])
    setExpanded([])
    select(id)
  }

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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = question.trim()
    if (!text || !enabled || pending) return

    const turn = pendingTurn(`local-${nextId.current++}`, text)
    setLocal((current) => [...current, turn])
    setQuestion('')
    try {
      // the first question opens a conversation; the server names it after the question
      const id = conversationId ?? (await create.mutateAsync(undefined)).id
      // the turn being asked stays on the page while the url follows the new conversation
      if (id !== conversationId) select(id)
      await send.mutateAsync({ conversationId: id, question: text })
      // refetched by the mutation: the server's copy replaces ours
      setLocal((current) => current.filter((item) => item.id !== turn.id))
    } catch (cause) {
      // a failed turn stays in the transcript. a toast would take the evidence with it.
      setLocal((current) => [...current.filter((item) => item.id !== turn.id), failedTurn(turn, cause)])
    }
  }

  const toggle = (id: string) => setExpanded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  return (
    <>
      <PageHeader title={t('assistant.title')} subtitle={scope ?? t('assistant.scope')} actions={enabled ? <ModelPicker /> : null} />

      <div className="mx-auto grid w-full max-w-6xl gap-6 p-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="space-y-2" aria-label={t('assistant.conversations')}>
          <Button type="button" variant="secondary" className="w-full" onClick={() => open(null)} disabled={conversationId === null && local.length === 0}>
            <Plus className="h-4 w-4" />
            {t('assistant.newConversation')}
          </Button>
          {(conversations.data ?? []).length === 0 ? (
            <p className="px-1 text-xs text-ink-muted">{t('assistant.noConversations')}</p>
          ) : (
            <ul data-testid="conversation-list" className="space-y-1">
              {(conversations.data ?? []).map((item) => (
                <li key={item.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => open(item.id)}
                    aria-current={item.id === conversationId ? 'page' : undefined}
                    className={cn(
                      'flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm',
                      item.id === conversationId ? 'bg-brand-soft font-medium text-brand-strong' : 'text-ink hover:bg-surface-muted'
                    )}
                  >
                    {item.title ?? t('assistant.untitled')}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t('assistant.archive', { title: item.title ?? t('assistant.untitled') })}
                    onClick={async () => {
                      await archive.mutateAsync(item.id)
                      if (item.id === conversationId) open(null)
                    }}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          {status.isLoading ? (
            <p className="text-sm text-ink-muted">{t('common.loading')}</p>
          ) : enabled ? null : (
            <Card>
              <CardBody className="flex items-start gap-3" role="status">
                <BotOff className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                <div>
                  <p className="text-sm font-medium text-ink">{t('assistant.disabled')}</p>
                  <p className="text-sm text-ink-muted">{t('assistant.disabledHint')}</p>
                </div>
              </CardBody>
            </Card>
          )}

          {conversation.isError ? (
            <p className="text-sm text-danger" role="alert">
              {t('assistant.conversationMissing')}
            </p>
          ) : null}

          {turns.length === 0 ? (
            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div>
                    <p className="text-sm font-medium text-ink">{t('assistant.emptyTitle')}</p>
                    <p className="text-sm text-ink-muted">{t('assistant.emptyHint')}</p>
                  </div>
                </div>
                <div>
                  <p className="pb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('assistant.suggestionsTitle')}</p>
                  <div className="flex flex-col items-start gap-1.5">
                    {suggestions.map((suggestion) => (
                      <Button key={suggestion} type="button" variant="secondary" size="sm" className="text-left" onClick={() => setQuestion(suggestion)}>
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : (
            <ol data-testid="assistant-transcript" className="space-y-4">
              {turns.map((turn) => (
                <TurnView key={turn.id} turn={turn} expanded={expanded.includes(turn.id)} onToggle={() => toggle(turn.id)} />
              ))}
            </ol>
          )}

          <div ref={end} />

          <form onSubmit={submit} className="sticky bottom-0 -mx-2 flex items-center gap-2 bg-surface-muted px-2 py-3">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={!enabled || pending}
              placeholder={t('assistant.placeholder')}
              aria-label={t('assistant.placeholder')}
            />
            <Button type="submit" disabled={!enabled || pending || question.trim() === ''}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {pending ? t('assistant.sending') : t('assistant.send')}
            </Button>
          </form>
        </section>
      </div>
    </>
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

function TurnView({ turn, expanded, onToggle }: { turn: Turn; expanded: boolean; onToggle: () => void }) {
  // the assistant's strings live in its own namespace; common.loading stays core's
  const { t } = useTranslation(['agent', 'common'])
  const state = turnStatus(turn)
  const steps = turn.answer?.steps ?? []

  return (
    <li className="space-y-2">
      <div className="flex justify-end">
        <p className="max-w-[80%] whitespace-pre-wrap rounded-card bg-brand-soft px-4 py-2 text-sm text-brand-strong">{turn.question}</p>
      </div>

      {state === 'pending' ? (
        <Card>
          <CardBody className="flex items-center gap-2 text-sm text-ink-muted" role="status" data-testid="turn-pending">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('assistant.thinking')}
          </CardBody>
        </Card>
      ) : null}

      {state === 'failed' && turn.error ? (
        <Card data-testid="turn-failed">
          <CardBody className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-medium text-ink">{t('assistant.failed')}</p>
              <p className="text-sm text-ink-muted">{turn.error.message}</p>
              {turn.error.violations.length > 0 ? (
                <ul className="mt-1 list-disc pl-4 text-xs text-ink-muted">
                  {turn.error.violations.map((violation) => (
                    <li key={violation}>{violation}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {state === 'answered' && turn.answer ? (
        <Card data-testid="turn-answer">
          <CardBody className="space-y-3">
            {turn.answer.truncated ? (
              <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/5 px-3 py-2" role="alert" data-testid="truncated-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <div>
                  <p className="text-sm font-medium text-ink">{t('assistant.truncated')}</p>
                  <p className="text-xs text-ink-muted">{t('assistant.truncatedHint')}</p>
                </div>
              </div>
            ) : null}

            <p className="whitespace-pre-wrap text-sm text-ink">{turn.answer.answer}</p>

            {steps.length === 0 ? (
              <p className="text-xs text-ink-muted">{t('assistant.noSteps')}</p>
            ) : (
              <div>
                <Button variant="ghost" size="sm" className="px-0" aria-expanded={expanded} aria-controls={`steps-${turn.id}`} onClick={onToggle}>
                  <Wrench className="h-4 w-4" />
                  {expanded ? t('assistant.hideSteps') : t('assistant.showSteps', { n: steps.length })}
                </Button>
                {expanded ? (
                  <ol id={`steps-${turn.id}`} data-testid="turn-steps" className="mt-2 space-y-2 border-l border-border pl-4">
                    {steps.map((step, index) => (
                      <li key={`${step.tool}-${index}`} className="space-y-1">
                        <p className="font-mono text-xs font-semibold text-ink">{step.tool}</p>
                        {formatStepInput(step.input).length === 0 ? (
                          <p className="text-xs text-ink-muted">{t('assistant.noArguments')}</p>
                        ) : (
                          <dl className="space-y-0.5">
                            {formatStepInput(step.input).map((argument) => (
                              <div key={argument.name} className="flex gap-2 text-xs">
                                <dt className="shrink-0 font-medium text-ink-muted">{argument.name}</dt>
                                <dd className="font-mono text-ink">{argument.value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        <p className="text-xs text-ink-muted">{step.summary}</p>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}
    </li>
  )
}
