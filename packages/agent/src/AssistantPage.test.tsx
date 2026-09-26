import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantPage } from './AssistantPage'
import { ApiError, coreModule } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import type { AgentAnswer, AgentStatus } from './types'
import { agentModule } from './module'

// the mock factories run at import time, so the mutable fixture has to be hoisted with them
const { state } = vi.hoisted(() => ({
  state: {
    status: null as AgentStatus | null,
    statusError: false,
    ask: vi.fn()
  }
}))

vi.mock('./api', () => ({
  useAgentStatus: () => ({ data: state.status, isLoading: false, isError: state.statusError }),
  useAskAgent: () => ({ mutateAsync: state.ask })
}))

const answer: AgentAnswer = {
  answer: 'Hay 3 objetos con geometría.',
  steps: [{ tool: 'list_objects', input: { withGeometry: true }, summary: 'Devolvió 3 objetos' }],
  truncated: false
}

beforeEach(() => {
  state.status = { enabled: true, model: 'claude-sonnet' }
  state.statusError = false
  state.ask = vi.fn().mockResolvedValue(answer)
})

async function askSomething(question = '¿qué objetos tienen geometría?') {
  await userEvent.type(screen.getByRole('textbox'), question)
  await userEvent.click(screen.getByRole('button', { name: /Preguntar/ }))
}

describe('AssistantPage', () => {
  it('adds a pending turn while the agent works and then the answer', async () => {
    let settle: (value: AgentAnswer) => void = () => {}
    state.ask.mockImplementation(() => new Promise<AgentAnswer>((resolve) => (settle = resolve)))
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
    state.ask.mockResolvedValue({ ...answer, truncated: true })
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
})
