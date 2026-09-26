import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, BotOff, Loader2, Send, ShieldCheck, Wrench } from 'lucide-react'
import { PageHeader } from '@wasichai/core'
import { Badge, Button, Card, CardBody, Input } from '@wasichai/ui'
import { useAgentStatus, useAskAgent } from './api'
import { answeredTurn, failedTurn, formatStepInput, pendingTurn, replaceTurn, turnStatus, type Turn } from './transcript'

export function AssistantPage() {
  // the assistant's strings live in its own namespace; common.loading stays core's
  const { t } = useTranslation(['agent', 'common'])
  const status = useAgentStatus()
  const ask = useAskAgent()
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const nextId = useRef(0)
  const end = useRef<HTMLDivElement>(null)

  // missing endpoint counts as off: the page still renders, the input does not.
  const enabled = status.data?.enabled === true
  const pending = turns.some((turn) => turnStatus(turn) === 'pending')
  const suggestions = [t('assistant.suggestionObjects'), t('assistant.suggestionRecords'), t('assistant.suggestionGeometry')]

  useEffect(() => {
    // jsdom has no scrollIntoView
    end.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [turns])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = question.trim()
    if (!text || !enabled || pending) return

    const turn = pendingTurn(String(nextId.current++), text)
    setTurns((current) => [...current, turn])
    setQuestion('')
    try {
      const answer = await ask.mutateAsync(text)
      setTurns((current) => replaceTurn(current, answeredTurn(turn, answer)))
    } catch (cause) {
      // a failed turn stays in the transcript. a toast would take the evidence with it.
      setTurns((current) => replaceTurn(current, failedTurn(turn, cause)))
    }
  }

  const toggle = (id: string) => setExpanded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  return (
    <>
      <PageHeader
        title={t('assistant.title')}
        subtitle={t('assistant.scope')}
        actions={
          enabled && status.data?.model ? (
            <Badge>
              {t('assistant.model')}: {status.data.model}
            </Badge>
          ) : null
        }
      />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-8">
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
      </div>
    </>
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
