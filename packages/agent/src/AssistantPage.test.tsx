import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantPage } from './AssistantPage'
import { ApiError, coreModule } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import type { AgentAnswer, AgentConversation, AgentConversationDetail, AgentExchange, AgentStatus } from './types'
import { agentModule } from './module'

// the mock factories run at import time, so the mutable fixture has to be hoisted with them
const { state } = vi.hoisted(() => ({
  state: {
    status: null as AgentStatus | null,
    statusError: false,
    conversations: [] as AgentConversation[],
    detail: null as AgentConversationDetail | null,
    ask: vi.fn(),
    create: vi.fn(),
    archive: vi.fn(),
    pick: vi.fn()
  }
}))

// the server side of a conversation: create hands back an id, send answers with what `ask` resolves to
vi.mock('./api', () => ({
  useAgentStatus: () => ({ data: state.status, isLoading: false, isError: state.statusError }),
  useConversations: () => ({ data: state.conversations }),
  useConversation: (id: string | null) => ({ data: id ? state.detail : undefined, isError: false }),
  useCreateConversation: () => ({ mutateAsync: state.create }),
  useSendMessage: () => ({ mutateAsync: ({ question }: { question: string }) => state.ask(question) }),
  useArchiveConversation: () => ({ mutateAsync: state.archive }),
  useUpdateAgentSettings: () => ({ mutate: state.pick, isPending: false })
}))

const answer: AgentAnswer = {
  answer: 'Hay 3 objetos con geometría.',
  steps: [{ tool: 'list_objects', input: { withGeometry: true }, summary: 'Devolvió 3 objetos' }],
  truncated: false
}

const message = (id: string, role: 'USER' | 'ASSISTANT', content: string) => ({
  id,
  role,
  content,
  steps: [],
  truncated: false,
  usage: null,
  model: null,
  createdAt: '2026-11-24T10:00:00Z'
})

// what the server keeps after a successful ask: the question and the answer, as stored messages
function stored(question: string, result: AgentAnswer): AgentExchange {
  const exchange = {
    question: message('q', 'USER', question),
    answer: { ...message('a', 'ASSISTANT', result.answer), steps: result.steps, truncated: result.truncated }
  }
  state.detail = { conversation: { id: 'c1', title: question, createdAt: '', updatedAt: '' }, messages: [exchange.question, exchange.answer] }
  return exchange
}

beforeEach(() => {
  state.status = { enabled: true, model: 'claude-sonnet' }
  state.statusError = false
  state.conversations = []
  state.detail = null
  state.ask = vi.fn().mockImplementation(async (question: string) => stored(question, answer))
  state.create = vi.fn().mockResolvedValue({ id: 'c1', title: null, createdAt: '', updatedAt: '' })
  state.archive = vi.fn().mockResolvedValue(undefined)
  state.pick = vi.fn()
})

async function askSomething(question = '¿qué objetos tienen geometría?') {
  await userEvent.type(screen.getByRole('textbox'), question)
  await userEvent.click(screen.getByRole('button', { name: /Preguntar/ }))
}

describe('AssistantPage', () => {
  it('adds a pending turn while the agent works and then the answer', async () => {
    let settle: (value: AgentAnswer) => void = () => {}
    state.ask.mockImplementation((question: string) => new Promise<AgentExchange>((resolve) => (settle = (value) => resolve(stored(question, value)))))
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()] })

    await askSomething('¿cuántos registros hay?')

    expect(screen.getByText('¿cuántos registros hay?')).toBeInTheDocument()
    expect(screen.getByTestId('turn-pending')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeDisabled()

    await act(async () => settle(answer))

    expect(screen.queryByTestId('turn-pending')).not.toBeInTheDocument()
    expect(screen.getByText('Hay 3 objetos con geometría.')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeEnabled()
    expect(state.ask).toHaveBeenCalledWith('¿cuántos registros hay?')
    // the first question opened a conversation
    expect(state.create).toHaveBeenCalledTimes(1)
  })

  it('lists the conversations and shows the open one from the server', () => {
    state.conversations = [{ id: 'c1', title: 'Predios omisos', createdAt: '', updatedAt: '' }]
    state.detail = {
      conversation: state.conversations[0],
      messages: [message('1', 'USER', '¿Cuántos omisos hay?'), message('2', 'ASSISTANT', 'Hay 42 omisos.')]
    }
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()], route: '/?c=c1' })

    expect(screen.getByRole('button', { name: 'Predios omisos' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('¿Cuántos omisos hay?')).toBeInTheDocument()
    expect(screen.getByText('Hay 42 omisos.')).toBeInTheDocument()
  })

  it('asks a follow-up in the open conversation without opening another', async () => {
    state.conversations = [{ id: 'c1', title: 'Predios omisos', createdAt: '', updatedAt: '' }]
    state.detail = { conversation: state.conversations[0], messages: [message('1', 'USER', 'q1'), message('2', 'ASSISTANT', 'a1')] }
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()], route: '/?c=c1' })

    await askSomething('¿y el año pasado?')

    expect(state.create).not.toHaveBeenCalled()
    expect(state.ask).toHaveBeenCalledWith('¿y el año pasado?')
  })

  it('archives a conversation from the list', async () => {
    state.conversations = [{ id: 'c1', title: 'Predios omisos', createdAt: '', updatedAt: '' }]
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()] })

    await userEvent.click(screen.getByRole('button', { name: 'Archivar «Predios omisos»' }))

    expect(state.archive).toHaveBeenCalledWith('c1')
  })

  it('lets the user pick another model, and the default clears the pick', async () => {
    state.status = { enabled: true, model: 'claude-sonnet-5-5', models: ['claude-sonnet-5-5', 'claude-haiku-5-5'] }
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()] })

    await userEvent.selectOptions(screen.getByRole('combobox'), 'claude-haiku-5-5')
    expect(state.pick).toHaveBeenLastCalledWith('claude-haiku-5-5')

    await userEvent.selectOptions(screen.getByRole('combobox'), 'claude-sonnet-5-5')
    expect(state.pick).toHaveBeenLastCalledWith(null)
  })

  it('hides the steps until they are expanded', async () => {
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()] })

    await askSomething()
    expect(await screen.findByTestId('turn-answer')).toBeInTheDocument()
    expect(screen.queryByTestId('turn-steps')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Ver los pasos \(1\)/ }))

    expect(screen.getByTestId('turn-steps')).toBeInTheDocument()
    expect(screen.getByText('list_objects')).toBeInTheDocument()
    expect(screen.getByText('withGeometry')).toBeInTheDocument()
    expect(screen.getByText('true')).toBeInTheDocument()
    expect(screen.getByText('Devolvió 3 objetos')).toBeInTheDocument()
  })

  it('warns that a truncated answer may be incomplete', async () => {
    state.ask.mockImplementation(async (question: string) => stored(question, { ...answer, truncated: true }))
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()] })

    await askSomething()

    expect(await screen.findByTestId('truncated-warning')).toHaveTextContent('Respuesta incompleta')
  })

  it('keeps a failed request in the transcript with its violations', async () => {
    state.ask.mockRejectedValue(new ApiError(400, 'La pregunta es demasiado larga', [{ field: 'question', message: 'Máximo 500 caracteres' }]))
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()] })

    await askSomething()

    expect(await screen.findByTestId('turn-failed')).toBeInTheDocument()
    expect(screen.getByText('La pregunta es demasiado larga')).toBeInTheDocument()
    expect(screen.getByText('question: Máximo 500 caracteres')).toBeInTheDocument()
  })

  it('says the assistant is off and blocks the input when it is not configured', () => {
    state.status = { enabled: false, model: '' }
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()] })

    expect(screen.getByText('El asistente no está configurado')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Preguntar/ })).toBeDisabled()
  })

  it('treats a missing status endpoint as not configured', () => {
    state.status = null
    state.statusError = true
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()] })

    expect(screen.getByText('El asistente no está configurado')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('fills the input with a suggested question', async () => {
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()] })

    await userEvent.click(screen.getByRole('button', { name: '¿Cuántos registros hay en cada objeto?' }))

    expect(screen.getByRole('textbox')).toHaveValue('¿Cuántos registros hay en cada objeto?')
  })

  it('states that the assistant only sees what the user may see', () => {
    renderWithProviders(<AssistantPage />, { modules: [coreModule, agentModule()] })

    expect(screen.getByText(/solo ve lo que tu usuario tiene permiso de ver/)).toBeInTheDocument()
  })

  it('offers the own suggestions and scope of the app when given', () => {
    renderWithProviders(<AssistantPage suggestions={['¿Cuántos omisos hay en 2026?']} scope="Solo datos de tu municipalidad." />, {
      modules: [coreModule, agentModule()]
    })

    expect(screen.getByRole('button', { name: '¿Cuántos omisos hay en 2026?' })).toBeInTheDocument()
    expect(screen.getByText('Solo datos de tu municipalidad.')).toBeInTheDocument()
  })
})
