// fixture: two packages on disk, one depending on the other plus an external package,
// so we can assert internal @wasichai/* ranges get bumped and external ones don't.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { setVersion } from './set-version.mjs'

function writePackage(root, name, contents) {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify(contents, null, 4))
}

function readPackage(root, name) {
  return JSON.parse(readFileSync(join(root, name, 'package.json'), 'utf8'))
}

test('bumps own version and internal @wasichai/* deps, leaves external deps alone', () => {
  const root = mkdtempSync(join(tmpdir(), 'set-version-'))
  try {
    writePackage(root, 'core', {
      name: '@wasichai/core',
      version: '0.1.0',
      dependencies: { react: '^19.0.0' }
    })
    writePackage(root, 'ui', {
      name: '@wasichai/ui',
      version: '0.1.0',
      dependencies: { '@wasichai/core': '^0.1.0', lodash: '^4.17.21' },
      peerDependencies: { '@wasichai/core': '^0.1.0' },
      optionalDependencies: { '@wasichai/core': '^0.1.0', 'left-pad': '^1.3.0' }
    })

    setVersion('0.2.0', root)

    const core = readPackage(root, 'core')
    assert.equal(core.version, '0.2.0')
    assert.equal(core.dependencies.react, '^19.0.0') // external dep, untouched

    const ui = readPackage(root, 'ui')
    assert.equal(ui.version, '0.2.0')
    assert.equal(ui.dependencies['@wasichai/core'], '0.2.0')
    assert.equal(ui.dependencies.lodash, '^4.17.21')
    assert.equal(ui.peerDependencies['@wasichai/core'], '0.2.0')
    assert.equal(ui.optionalDependencies['@wasichai/core'], '0.2.0')
    assert.equal(ui.optionalDependencies['left-pad'], '^1.3.0')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('skips directories with no package.json without throwing', () => {
  const root = mkdtempSync(join(tmpdir(), 'set-version-'))
  try {
    mkdirSync(join(root, 'empty'))
    assert.doesNotThrow(() => setVersion('0.2.0', root))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
