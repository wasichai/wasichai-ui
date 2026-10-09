import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { ApiError } from '../../api/client'
import { writePolicy, type WritePolicy } from '../../lib/writePolicy'
import { ReasonDialog } from './ReasonDialog'
import { useReasonPrompt } from './useReasonPrompt'
import { WritePolicyNotice } from './WritePolicyNotice'

function renderDialog(props: { error?: string; busy?: boolean } = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  renderWithProviders(<ReasonDialog onConfirm={onConfirm} onCancel={onCancel} {...props} />, { language: 'es' })
  return { onConfirm, onCancel }
}

describe('ReasonDialog', () => {
  it('confirms the trimmed reason', async () => {
    const { onConfirm } = renderDialog()

    expect(screen.getByRole('dialog', { name: 'Motivo del cambio' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Motivo'), '  revisión  ')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(onConfirm).toHaveBeenCalledWith('revisión')
  })

  it('counts code points as the user types', async () => {
    renderDialog()
    await userEvent.type(screen.getByLabelText('Motivo'), 'ñ😀')
    expect(screen.getByText('2/500')).toBeInTheDocument()
  })

  it('refuses a blank reason and says why', async () => {
    const { onConfirm } = renderDialog()

    await userEvent.type(screen.getByLabelText('Motivo'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Escribe el motivo del cambio')).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo')).toHaveAttribute('aria-invalid', 'true')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('refuses a reason too long for the server', async () => {
    const { onConfirm } = renderDialog()

    // paste: typing 501 characters one by one is slow
    screen.getByLabelText('Motivo').focus()
    await userEvent.paste('a'.repeat(501))
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Como máximo 500 caracteres')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('cancels on Escape and on the cancel button', async () => {
    const { onConfirm, onCancel } = renderDialog()

    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCancel).toHaveBeenCalledTimes(3)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('shows a server message about the reason under the field', () => {
    renderDialog({ error: 'mínimo 10 caracteres' })
    expect(screen.getByRole('alert')).toHaveTextContent('mínimo 10 caracteres')
  })

  it('holds the confirm button while the write runs', () => {
    renderDialog({ busy: true })
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(screen.getByLabelText('Motivo')).toHaveAttribute('readonly')
  })
})

function Harness({ required, write }: { required: boolean; write: (reason: string | undefined) => Promise<unknown> }) {
  const prompt = useReasonPrompt()
  return (
    <>
      <button onClick={() => prompt.withReason(write, { required })}>escribir</button>
      {prompt.dialog}
    </>
  )
}

describe('useReasonPrompt', () => {
  // the hook swallows a failed write (callers read mutation.error); a leak would land here
  const unhandled: unknown[] = []
  const record = (reason: unknown) => unhandled.push(reason)
  beforeEach(() => {
    unhandled.length = 0
    process.on('unhandledRejection', record)
  })
  afterEach(() => {
    process.off('unhandledRejection', record)
  })
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

  it('writes at once when no reason is required', async () => {
    const write = vi.fn(async () => undefined)
    renderWithProviders(<Harness required={false} write={write} />, { language: 'es' })

    await userEvent.click(screen.getByRole('button', { name: 'escribir' }))

    expect(write).toHaveBeenCalledWith(undefined)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks first, then writes with the reason', async () => {
    const write = vi.fn(async () => undefined)
    renderWithProviders(<Harness required write={write} />, { language: 'es' })

    await userEvent.click(screen.getByRole('button', { name: 'escribir' }))
    expect(write).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText('Motivo'), 'motivo')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(write).toHaveBeenCalledWith('motivo')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('sends nothing when the prompt is cancelled', async () => {
    const write = vi.fn(async () => undefined)
    renderWithProviders(<Harness required write={write} />, { language: 'es' })

    await userEvent.click(screen.getByRole('button', { name: 'escribir' }))
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(write).not.toHaveBeenCalled()
  })

  it('keeps the dialog open when the server refuses the reason', async () => {
    const write = vi.fn(async () => {
      throw new ApiError(400, 'Bad', [{ field: 'reason', message: 'mínimo 10' }])
    })
    renderWithProviders(<Harness required write={write} />, { language: 'es' })

    await userEvent.click(screen.getByRole('button', { name: 'escribir' }))
    await userEvent.type(screen.getByLabelText('Motivo'), 'corto')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('mínimo 10')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // the typed reason stays, ready to be fixed
    expect(screen.getByLabelText('Motivo')).toHaveValue('corto')
  })

  // plain functions, not vi.fn: a spy handles the promises it returns, which would hide a leak
  const failing = (cause: ApiError) => {
    const calls: (string | undefined)[] = []
    const write = (reason: string | undefined) => {
      calls.push(reason)
      return Promise.reject(cause)
    }
    return { calls, write }
  }

  it('closes on any other refusal and does not throw', async () => {
    const { calls, write } = failing(new ApiError(409, 'Conflicto'))
    renderWithProviders(<Harness required write={write} />, { language: 'es' })

    await userEvent.click(screen.getByRole('button', { name: 'escribir' }))
    await userEvent.type(screen.getByLabelText('Motivo'), 'motivo')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls).toEqual(['motivo'])
    await settle()
    expect(unhandled).toEqual([])
  })

  it('does not throw when a write with no reason fails', async () => {
    const { calls, write } = failing(new ApiError(403, 'Prohibido'))
    renderWithProviders(<Harness required={false} write={write} />, { language: 'es' })

    await userEvent.click(screen.getByRole('button', { name: 'escribir' }))

    expect(calls).toEqual([undefined])
    expect(screen.queryByRole('dialog')).toBeNull()
    await settle()
    expect(unhandled).toEqual([])
  })
})

describe('WritePolicyNotice', () => {
  const renderNotice = (policy: WritePolicy, scope?: 'record' | 'link') =>
    renderWithProviders(<WritePolicyNotice policy={policy} scope={scope} />, { language: 'es' })

  it('says why a write is not offered', () => {
    renderNotice(writePolicy({ appendOnly: true }))
    expect(screen.getByRole('status')).toHaveTextContent('Los registros de este objeto solo se crean: no se editan ni se eliminan.')
  })

  it('renders nothing when every write is offered', () => {
    renderNotice(writePolicy({}))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('names api-only before append-only', () => {
    renderNotice(writePolicy({ apiOnly: true, appendOnly: true }))
    expect(screen.getByRole('status')).toHaveTextContent('Este objeto solo lo escribe la aplicación: aquí es de solo lectura.')
  })

  it('speaks of links when it guards a link', () => {
    renderNotice(writePolicy({}, { appendOnly: true }), 'link')
    expect(screen.getByRole('status')).toHaveTextContent('Uno de los dos objetos es de solo anexado: no se vincula ni se desvincula.')
  })
})
