import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { coreModule } from '@wasichai/core'
import { IssuedDocumentLink } from './IssuedDocumentLink'
import { documentsModule } from './module'
import { renderWithProviders } from '@wasichai/testing'
import type { IssuedDocument } from './types'

const document: IssuedDocument = {
  id: 'document-1',
  number: 'SGTM-2026-001',
  year: 2026,
  sequence: 1,
  status: 'VALID',
  recordId: 'record-1',
  objectName: 'predio',
  issuedAt: '2026-09-20T00:00:00Z',
  snapshot: {
    template: { type: 'doc', content: [] },
    values: {},
    platform: {},
    related: {},
    objectName: 'predio',
    objectLabel: 'Predio',
    number: 'SGTM-2026-001',
    issuedAt: '2026-09-20T00:00:00Z'
  }
}

vi.mock('./api', () => ({
  useIssuedDocument: () => ({ data: document, isLoading: false })
}))

describe('IssuedDocumentLink', () => {
  it('opens the dialog with a link to the print page in a new tab', async () => {
    renderWithProviders(<IssuedDocumentLink documentId="document-1" />, { modules: [coreModule, documentsModule()] })

    await userEvent.click(screen.getByRole('button', { name: /Ver documento/ }))

    const link = screen.getByRole('link', { name: /Imprimir/ })
    expect(link).toHaveAttribute('href', '/documents/document-1/print')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('builds the print link under the base path the app gave the module', async () => {
    renderWithProviders(<IssuedDocumentLink documentId="document-1" />, { modules: [coreModule, documentsModule({ basePath: 'docs' })] })

    await userEvent.click(screen.getByRole('button', { name: /Ver documento/ }))

    expect(screen.getByRole('link', { name: /Imprimir/ })).toHaveAttribute('href', '/docs/documents/document-1/print')
  })
})
