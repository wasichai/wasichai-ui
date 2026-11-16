import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { createWasichaiI18n } from '../i18n/createI18n'
import { AccessDenied } from './AccessDenied'

function mount(onSignOut: () => void) {
  const i18n = createWasichaiI18n({ languages: ['es', 'en'], storageKey: 'denied-test.lang', modules: [] })
  return render(
    <I18nextProvider i18n={i18n}>
      <AccessDenied detail="organization muni-x is not in this app" onSignOut={onSignOut} />
    </I18nextProvider>
  )
}

describe('AccessDenied', () => {
  it('says why, full page, with a way out', async () => {
    const onSignOut = vi.fn()
    mount(onSignOut)

    expect(screen.getByRole('heading', { name: 'Sin acceso' })).toBeInTheDocument()
    expect(screen.getByText('organization muni-x is not in this app')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
