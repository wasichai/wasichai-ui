// fixture repo on disk: two public packages, one private, a release-please config.
// each test breaks one thing and expects exactly that problem back.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { checkReleaseConfig, packDryRun } from './check-release.mjs'

const EXPECTED = ['@wasichai/a', '@wasichai/b']

function write(root, path, contents) {
  const full = join(root, path)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, typeof contents === 'string' ? contents : JSON.stringify(contents, null, 4))
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'check-release-'))
  const lib = (name, deps = {}) => ({
    name,
    version: '0.1.0',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' }, './package.json': './package.json' },
    files: ['dist'],
    peerDependencies: deps
  })
  write(root, 'package.json', { name: 'root', private: true, workspaces: ['packages/*'] })
  write(root, 'packages/a/package.json', lib('@wasichai/a'))
  write(root, 'packages/b/package.json', lib('@wasichai/b', { '@wasichai/a': '*', react: '^19.3.0' }))
  write(root, 'packages/smoke/package.json', { name: '@wasichai/smoke', version: '0.1.0', private: true })
  write(root, 'release-please-config.json', {
    packages: {
      '.': {
        'extra-files': [
          'gradle.properties',
          { type: 'json', path: 'package.json', jsonpath: '$.version' },
          { type: 'json', path: 'packages/a/package.json', jsonpath: '$.version' },
          { type: 'json', path: 'packages/b/package.json', jsonpath: '$.version' }
        ]
      }
    }
  })
  return root
}

const packAll = () => ['package.json', 'dist/index.js', 'dist/index.d.ts']

test('a consistent repo has no problems', () => {
  const root = fixture()
  try {
    assert.deepEqual(checkReleaseConfig(root, EXPECTED), [])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a private package that loses its flag would leak', () => {
  const root = fixture()
  try {
    write(root, 'packages/smoke/package.json', { name: '@wasichai/smoke', version: '0.1.0' })
    const problems = checkReleaseConfig(root, EXPECTED)
    assert.ok(
      problems.some((p) => p.includes('@wasichai/smoke would be published')),
      problems.join('\n')
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('an expected package that goes missing or private is reported', () => {
  const root = fixture()
  try {
    assert.ok(checkReleaseConfig(root, [...EXPECTED, '@wasichai/c']).some((p) => p.includes('@wasichai/c is expected')))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a public package release-please does not bump is reported', () => {
  const root = fixture()
  try {
    const config = JSON.parse(readFileSync(join(root, 'release-please-config.json'), 'utf8'))
    config.packages['.']['extra-files'] = config.packages['.']['extra-files'].filter((f) => f.path !== 'packages/b/package.json')
    write(root, 'release-please-config.json', config)
    assert.ok(checkReleaseConfig(root, EXPECTED).some((p) => p.includes('packages/b/package.json is not bumped')))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('pack dry run pins internal ranges to the release and leaves the repo untouched', () => {
  const root = fixture()
  try {
    assert.deepEqual(packDryRun(root, '1.2.3', { pack: packAll }), [])
    const b = JSON.parse(readFileSync(join(root, 'packages/b/package.json'), 'utf8'))
    assert.equal(b.peerDependencies['@wasichai/a'], '*')
    assert.equal(b.version, '0.1.0')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('pack dry run reports a tarball without its entry points', () => {
  const root = fixture()
  try {
    const problems = packDryRun(root, '1.2.3', { pack: () => ['package.json'] })
    assert.ok(
      problems.some((p) => p.includes('@wasichai/a tarball lacks dist/index.js')),
      problems.join('\n')
    )
    assert.ok(problems.some((p) => p.includes('dist/index.d.ts')))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('pack dry run refuses a missing version', () => {
  const root = fixture()
  try {
    assert.throws(() => packDryRun(root, undefined, { pack: packAll }), /version/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
