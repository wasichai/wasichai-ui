import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'

import { REPO_ROOT, mapSpecifier, portSource } from './port-from-sapgis.mjs'

const inCore = join(REPO_ROOT, 'packages/core/src/features/objects/ObjectsPage.tsx')
const inGis = join(REPO_ROOT, 'packages/gis/src/MapPage.tsx')

test('maps sapgis locations to paths relative to the target inside core', () => {
  assert.equal(mapSpecifier('@/lib/queries', inCore), '../../queries')
  assert.equal(mapSpecifier('@/types/metadata', inCore), '../../types/metadata')
  assert.equal(mapSpecifier('@/lib/api', inCore), '../../api/client')
  assert.equal(mapSpecifier('@/app/auth', inCore), '../../auth/AuthProvider')
  assert.equal(mapSpecifier('@/components/layout/AppShell', inCore), '../../shell/PageHeader')
  assert.equal(mapSpecifier('@/features/history/types', inCore), '../../types/audit')
  assert.equal(mapSpecifier('@/features/objects/objectDraft', inCore), './objectDraft')
  assert.equal(mapSpecifier('@/components/dynamic-form/DynamicForm', inCore), '../../components/dynamic-form/DynamicForm')
})

test('maps shared code to packages', () => {
  assert.equal(mapSpecifier('@/components/ui/button', inCore), '@wasichai/ui')
  assert.equal(mapSpecifier('@/lib/utils', inCore), '@wasichai/ui')
  assert.equal(mapSpecifier('@/test/render', inCore), '@wasichai/testing')
  assert.equal(mapSpecifier('@/lib/queries', inGis), '@wasichai/core')
})

test('leaves what it cannot place for a human', () => {
  assert.equal(mapSpecifier('@/lib/geo', inCore), null)
  const { text, unmapped } = portSource("import { featureIdOf } from '@/lib/geo'\n", inCore)
  assert.equal(text, "import { featureIdOf } from '@/lib/geo'\n")
  assert.deepEqual(unmapped, ['@/lib/geo'])
})

test('rewrites vi.mock paths, drops i18n side-effect imports and renames sapgis', () => {
  const source = [
    "import { Button } from '@/components/ui/button'",
    "import '@/features/history/i18n'",
    "import './i18n'",
    "vi.mock('@/lib/queries', async (importOriginal) => importOriginal<typeof import('@/lib/queries')>())",
    "const email = 'ana@sapgis.test' // SAPGIS Sapgis",
    ''
  ].join('\n')
  const { text, unmapped } = portSource(source, inCore)
  assert.deepEqual(unmapped, [])
  assert.equal(
    text,
    [
      "import { Button } from '@wasichai/ui'",
      "vi.mock('../../queries', async (importOriginal) => importOriginal<typeof import('../../queries')>())",
      "const email = 'ana@wasichai.test' // Wasichai Wasichai",
      ''
    ].join('\n')
  )
})

const inWorkflow = join(REPO_ROOT, 'packages/workflow/src/WorkflowBuilderPage.tsx')
const inPagesBuilder = join(REPO_ROOT, 'packages/pages/src/builder/Inspector.tsx')
const inGisLayers = join(REPO_ROOT, 'packages/gis/src/layers/LayersPage.tsx')
const inDocuments = join(REPO_ROOT, 'packages/documents/src/module.tsx')
const inViews = join(REPO_ROOT, 'packages/views/src/ViewBuilderPage.tsx')

test('maps a module location inside its own package to a relative path', () => {
  assert.equal(mapSpecifier('@/features/workflows/api', inWorkflow), './api')
  assert.equal(mapSpecifier('@/features/pages/builder/preview/ComponentMock', inPagesBuilder), './preview/ComponentMock')
  assert.equal(mapSpecifier('@/components/map/MapView', inGisLayers), '../components/MapView')
  assert.equal(mapSpecifier('@/lib/geo', inGisLayers), '../lib/geo')
  assert.equal(mapSpecifier('@/features/layers/types', inGisLayers), './types')
  assert.equal(mapSpecifier('@/features/history/IssuedDocumentLink', inDocuments), './IssuedDocumentLink')
  assert.equal(mapSpecifier('@/features/assistant/api', join(REPO_ROOT, 'packages/agent/src/AssistantPage.tsx')), './api')
})

test('leaves a cross-module import for a human, and keeps what stayed in core in core', () => {
  assert.equal(mapSpecifier('@/features/workflows/api', inPagesBuilder), null)
  assert.equal(mapSpecifier('@/lib/geo', inPagesBuilder), null)
  assert.equal(mapSpecifier('@/features/pages/builder/templates', inPagesBuilder), '@wasichai/core')
  assert.equal(mapSpecifier('@/features/views/viewColumns', inViews), '@wasichai/core')
  assert.equal(mapSpecifier('@/features/history/changes', inWorkflow), '@wasichai/core')
  assert.equal(mapSpecifier('@/features/admin/api', inWorkflow), '@wasichai/core')
  const { unmapped } = portSource("import { useWorkflow } from '@/features/workflows/api'\n", inPagesBuilder)
  assert.deepEqual(unmapped, ['@/features/workflows/api'])
})
