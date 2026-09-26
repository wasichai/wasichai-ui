import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { MODULES, PACKAGES_DIR, moduleManifest } from './scaffold-module.mjs'

const core = JSON.parse(readFileSync(join(PACKAGES_DIR, 'core/package.json'), 'utf8'))
const manifest = (name) =>
  moduleManifest(
    MODULES.find((spec) => spec.name === name),
    core
  )

test('every module peers on core and ui at any version, in lockstep with core', () => {
  assert.deepEqual(
    MODULES.map((spec) => spec.name),
    ['gis', 'workflow', 'automation', 'documents', 'pages', 'views', 'forms', 'agent']
  )
  for (const spec of MODULES) {
    const pkg = moduleManifest(spec, core)
    assert.equal(pkg.name, `@wasichai/${spec.name}`)
    assert.equal(pkg.version, core.version)
    assert.equal(pkg.peerDependencies['@wasichai/core'], '*')
    assert.equal(pkg.peerDependencies['@wasichai/ui'], '*')
    assert.equal(pkg.peerDependencies.react, core.peerDependencies.react)
    assert.equal(pkg.dependencies['lucide-react'], core.dependencies['lucide-react'])
    // set-version.mjs never bumps devDependencies, so an internal range there would go stale
    assert.deepEqual(
      Object.keys(pkg.devDependencies).filter((name) => name.startsWith('@wasichai/')),
      []
    )
  }
})

test('each heavy library belongs to exactly one module', () => {
  const owners = {}
  for (const spec of MODULES) for (const dep of Object.keys(spec.dependencies)) (owners[dep] ??= []).push(spec.name)
  assert.deepEqual(owners, {
    'maplibre-gl': ['gis'],
    'terra-draw': ['gis'],
    'terra-draw-maplibre-gl-adapter': ['gis'],
    '@xyflow/react': ['workflow'],
    '@tiptap/core': ['documents'],
    '@tiptap/react': ['documents'],
    '@tiptap/starter-kit': ['documents'],
    '@dnd-kit/core': ['pages']
  })
})

test('documents ships its print stylesheet, the others are side-effect free', () => {
  const documents = manifest('documents')
  assert.equal(documents.exports['./print.css'], './dist/print.css')
  assert.match(documents.scripts.build, / && cp src\/print\.css dist\/print\.css$/)
  assert.deepEqual(documents.sideEffects, ['./dist/print.css'])
  assert.equal(manifest('views').sideEffects, false)
  assert.equal(manifest('views').exports['./print.css'], undefined)
})
