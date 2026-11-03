import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTranslation } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@wasichai/testing'
import { DataTable } from '../components/data-table/DataTable'
import { DynamicForm } from '../components/dynamic-form/DynamicForm'
import { describeChanges } from '../features/history/changes'
import type { FieldMeta, ObjectDefinition, RelatedSide } from '../types/metadata'
import { enumOptionLabel, fieldLabel, localizeDefinition, localizedText, objectPluralLabel, sideLabel } from './localizedMetadata'

// radix's listbox needs pointer capture jsdom lacks: a native select shows the same options and value
vi.mock('@wasichai/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wasichai/ui')>()),
  ...(await import('../test/nativeSelect'))
}))

function field(overrides: Partial<FieldMeta>): FieldMeta {
  return {
    id: overrides.name ?? 'f',
    name: 'codigo',
    label: 'Código',
    type: 'TEXT',
    required: false,
    unique: false,
    defaultValue: null,
    description: null,
    position: 0,
    enumOptions: null,
    relationTarget: null,
    visible: true,
    editable: true,
    ...overrides
  }
}

const tipo = field({
  name: 'tipo',
  label: 'Tipo',
  labels: { en: 'Type' },
  type: 'ENUM',
  required: true,
  enumOptions: ['LECTURA', 'VIDEO', 'QUIZ'],
  // QUIZ has no text: it shows its value
  enumOptionLabels: { LECTURA: { es: 'Lectura', en: 'Reading' }, VIDEO: { en: 'Video' } }
})

const leccion: ObjectDefinition = {
  id: 'o1',
  name: 'leccion',
  label: 'Lección',
  pluralLabel: 'Lecciones',
  description: 'Una lección de la unidad',
  labels: { en: 'Lesson' },
  pluralLabels: { en: 'Lessons' },
  descriptions: { en: "A unit's lesson" },
  enabled: true,
  fields: [field({ name: 'codigo', label: 'Código', labels: { en: 'Code', 'pt-BR': 'Código BR' }, required: true }), tipo]
}

// what a server without the maps sends
const plain: ObjectDefinition = { ...leccion, labels: undefined, pluralLabels: undefined, descriptions: undefined, fields: [field({ required: true })] }

// a button that switches the app's language, as the shell's does
function Switch({ to }: { to: string }) {
  const { i18n } = useTranslation()
  return (
    <button type="button" onClick={() => void i18n.changeLanguage(to)}>
      {`switch ${to}`}
    </button>
  )
}

describe('localizedText (#140, ADR-078)', () => {
  it('takes the language, then its primary subtag, then the single text', () => {
    const texts = { en: 'Code', pt: 'Código PT', 'pt-BR': 'Código BR' }
    expect(localizedText('Código', texts, 'en')).toBe('Code')
    expect(localizedText('Código', texts, 'pt-BR')).toBe('Código BR')
    expect(localizedText('Código', texts, 'pt-PT')).toBe('Código PT')
    expect(localizedText('Código', texts, 'en-GB')).toBe('Code')
    expect(localizedText('Código', texts, 'fr')).toBe('Código')
    expect(localizedText('Código', undefined, 'en')).toBe('Código')
  })

  it('resolves objects, fields, options and related sides', () => {
    expect(objectPluralLabel(leccion, 'en')).toBe('Lessons')
    expect(fieldLabel(leccion.fields[0], 'en')).toBe('Code')
    expect(fieldLabel(field({ label: '', labels: undefined }), 'en')).toBe('codigo')
    expect(enumOptionLabel(tipo, 'LECTURA', 'en')).toBe('Reading')
    expect(enumOptionLabel(tipo, 'QUIZ', 'en')).toBe('QUIZ')
    const side: RelatedSide = {
      relationship: 'r',
      label: 'Lecciones',
      type: 'ONE_TO_MANY',
      objectName: 'leccion',
      objectLabel: 'Lecciones',
      many: true,
      labels: { en: 'Lessons' }
    }
    expect(sideLabel(side, 'en')).toBe('Lessons')
    expect(sideLabel({ ...side, labels: undefined }, 'en')).toBe('Lecciones')
  })

  it('localizes a definition, the same twice, and a definition without maps reads as it came', () => {
    const english = localizeDefinition(leccion, 'en')
    expect([english.label, english.pluralLabel, english.description, english.fields[0].label]).toEqual(['Lesson', 'Lessons', "A unit's lesson", 'Code'])
    expect(localizeDefinition(english, 'en')).toEqual(english)
    expect(localizeDefinition(plain, 'en').fields[0]).toBe(plain.fields[0])
    expect(localizeDefinition(plain, 'en').label).toBe('Lección')
  })
})

describe('DynamicForm in the user language (#140)', () => {
  it('shows labels and options in english, and stores and sends the option value', async () => {
    const onSubmit = vi.fn()
    renderWithProviders(<DynamicForm definition={leccion} onSubmit={onSubmit} />, { language: 'en' })

    expect(screen.getByLabelText(/Code/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Code/), 'L-1')
    expect(screen.getByRole('option', { name: 'QUIZ' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox'), screen.getByRole('option', { name: 'Reading' }))
    expect(screen.getByRole('combobox')).toHaveValue('LECTURA')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].attributes).toMatchObject({ codigo: 'L-1', tipo: 'LECTURA' })
  })

  it('shows the spanish texts in spanish', async () => {
    renderWithProviders(<DynamicForm definition={leccion} onSubmit={vi.fn()} />, { language: 'es' })
    expect(screen.getByLabelText(/Código/)).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Lectura' })).toBeInTheDocument()
    // no spanish text for VIDEO: its value
    expect(screen.getByRole('option', { name: 'VIDEO' })).toBeInTheDocument()
  })

  it('says what is missing by the label in the language, and in it', async () => {
    renderWithProviders(<DynamicForm definition={leccion} onSubmit={vi.fn()} />, { language: 'en' })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Code: required')).toBeInTheDocument()
    expect(screen.getByText('Type: required')).toBeInTheDocument()
  })

  it('redraws its texts when the language changes while it is open', async () => {
    renderWithProviders(
      <>
        <Switch to="en" />
        <DynamicForm definition={leccion} onSubmit={vi.fn()} />
      </>,
      { language: 'es' }
    )
    expect(screen.getByLabelText(/Código/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'switch en' }))

    expect(await screen.findByLabelText(/Code/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Code: required')).toBeInTheDocument()
  })

  it('renders a server without the maps exactly as before', async () => {
    renderWithProviders(<DynamicForm definition={plain} onSubmit={vi.fn()} />, { language: 'en' })
    expect(screen.getByLabelText(/Código/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Código: required')).toBeInTheDocument()
  })
})

describe('DataTable in the user language (#140)', () => {
  const page = {
    content: [{ id: 'r1', createdAt: null, updatedAt: null, attributes: { codigo: 'L-1', tipo: 'LECTURA' } }],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1
  }
  const props = { search: '', onSearchChange: vi.fn(), sort: '', descending: false, onSortChange: vi.fn(), onPageChange: vi.fn(), onOpen: vi.fn() }

  it('heads its columns and shows an option by their texts', () => {
    renderWithProviders(<DataTable fields={leccion.fields} page={page} {...props} />, { language: 'en' })
    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Reading' })).toBeInTheDocument()
  })

  it('follows a language change', async () => {
    renderWithProviders(
      <>
        <Switch to="es" />
        <DataTable fields={leccion.fields} page={page} {...props} />
      </>,
      { language: 'en' }
    )
    await userEvent.click(screen.getByRole('button', { name: 'switch es' }))
    expect(await screen.findByRole('columnheader', { name: 'Código' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Lectura' })).toBeInTheDocument()
  })
})

describe('history in the user language (#140)', () => {
  it('names the field and the option values by their texts', async () => {
    renderWithProviders(<Switch to="en" />, { language: 'es' })
    await act(async () => screen.getByRole('button', { name: 'switch en' }).click())
    const [change] = describeChanges({ changes: [{ field: 'tipo', before: 'LECTURA', after: 'QUIZ' }] }, leccion)
    expect(change).toMatchObject({ label: 'Type', before: 'Reading', after: 'QUIZ' })
  })
})
