import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Alert, type AlertTone } from './alert'

// no i18n instance here: t() answers its key. the words are asserted in core's sharedPrimitives test
const DISMISS = 'common.dismissAlert'

describe('Alert', () => {
  it.each<[AlertTone, string, string]>([
    ['success', 'status', 'text-success'],
    ['warning', 'status', 'text-warning'],
    ['danger', 'alert', 'text-danger'],
    ['notice', 'status', 'text-notice']
  ])('draws %s as a %s, text in its colour', (tone, role, colour) => {
    render(<Alert tone={tone}>Hecho.</Alert>)
    const alert = screen.getByRole(role)
    expect(alert).toHaveTextContent('Hecho.')
    expect(alert).toHaveClass('text-sm', colour)
    expect(alert).toHaveAttribute('data-slot', 'alert')
    expect(alert).toHaveAttribute('data-tone', tone)
  })

  // a ternary tone (registered in time or late) switches how it is announced
  it('follows a tone that changes while mounted', () => {
    const { rerender } = render(<Alert tone="success">Registrado.</Alert>)
    expect(screen.getByRole('status')).toHaveAttribute('data-tone', 'success')
    rerender(<Alert tone="danger">Registrado.</Alert>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveAttribute('data-tone', 'danger')
  })

  it('writes the title in bold before the text, inside the text hook', () => {
    render(
      <Alert tone="warning" title="Atención.">
        Falta el año.
      </Alert>
    )
    const text = screen.getByRole('status').querySelector('[data-slot="alert-text"]')
    expect(text).toHaveTextContent('Atención. Falta el año.')
    expect(screen.getByText('Atención.').tagName).toBe('STRONG')
  })

  it("adds the place's classes to the classic look", () => {
    render(
      <Alert tone="danger" className="rounded-md bg-danger/10 px-3 py-2">
        No se guardó.
      </Alert>
    )
    expect(screen.getByRole('alert')).toHaveClass('text-sm', 'text-danger', 'rounded-md', 'bg-danger/10', 'px-3', 'py-2')
  })

  it('has no button without onDismiss', () => {
    render(<Alert tone="notice">Aviso.</Alert>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('dismisses with its check button', async () => {
    const onDismiss = vi.fn()
    render(
      <Alert tone="notice" onDismiss={onDismiss}>
        Aviso.
      </Alert>
    )
    const button = screen.getByRole('button', { name: DISMISS })
    expect(button).toHaveAttribute('data-slot', 'alert-dismiss')
    expect(button).toHaveAttribute('type', 'button')
    expect(button.querySelector('svg')).not.toBeNull()
    await userEvent.click(button)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
