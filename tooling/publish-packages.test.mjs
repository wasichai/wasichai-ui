// fixture packages on disk plus a fake npm backed by an in-memory registry: no network, no real publish.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { test } from 'node:test'

import { publishPackages } from './publish-packages.mjs'

const VERSION = '1.0.0-dev.0'

function fixture(version = VERSION) {
  const root = mkdtempSync(join(tmpdir(), 'publish-packages-'))
  const write = (dir, pkg) => {
    mkdirSync(join(root, dir))
    writeFileSync(join(root, dir, 'package.json'), JSON.stringify(pkg, null, 4))
  }
  // folder order b, a on purpose: publish follows folder names, not creation order
  write('b', { name: '@wasichai/b', version, peerDependencies: { '@wasichai/a': version } })
  write('a', { name: '@wasichai/a', version })
  write('smoke', { name: '@wasichai/smoke', version, private: true })
  return root
}

// registry: name -> { versions, latest }. like the real one, a first publish sets latest whatever --tag says.
function fakeNpm(registry = {}, { publishMovesLatest = false, failPublish } = {}) {
  const calls = []
  const ok = (stdout = '') => ({ status: 0, stdout: `${stdout}\n`, stderr: '' })
  const notFound = (what) => ({ status: 1, stdout: '', stderr: `npm error code E404\nnpm error 404 ${what} could not be found` })
  const npm = (args, { cwd }) => {
    calls.push({ args, dir: basename(cwd) })
    const [command, ...rest] = args
    if (command === 'view' && rest[1] === 'version') {
      const at = rest[0].lastIndexOf('@')
      const entry = registry[rest[0].slice(0, at)]
      return entry?.versions.includes(rest[0].slice(at + 1)) ? ok(rest[0].slice(at + 1)) : notFound(rest[0])
    }
    if (command === 'view' && rest[1] === 'dist-tags.latest') return registry[rest[0]] ? ok(registry[rest[0]].latest) : notFound(rest[0])
    if (command === 'publish') {
      const { name, version } = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
      if (failPublish === name) return { status: 1, stdout: '', stderr: 'npm error code E403\nnpm error 403 Forbidden' }
      const entry = (registry[name] ??= { versions: [], latest: version })
      entry.versions.push(version)
      if (publishMovesLatest || rest[1] === 'latest') entry.latest = version
      return ok(`+ ${name}@${version}`)
    }
    if (command === 'dist-tag' && rest[0] === 'add' && rest[2] === 'latest') {
      const at = rest[1].lastIndexOf('@')
      registry[rest[1].slice(0, at)].latest = rest[1].slice(at + 1)
      return ok()
    }
    throw new Error(`fake npm: unexpected ${args.join(' ')}`)
  }
  return { npm, calls, registry }
}

const released = () => ({
  '@wasichai/a': { versions: ['0.3.1'], latest: '0.3.1' },
  '@wasichai/b': { versions: ['0.3.1'], latest: '0.3.1' }
})

function withFixture(run) {
  const root = fixture()
  try {
    run(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const publishes = (calls) => calls.filter(({ args }) => args[0] === 'publish')

test('publishes every public package in folder order under the given dist-tag', () => {
  withFixture((packagesRoot) => {
    const { npm, calls, registry } = fakeNpm(released())
    const result = publishPackages({ packagesRoot, version: VERSION, distTag: 'dev', npm, log: () => {} })
    assert.deepEqual(result, { published: ['@wasichai/a', '@wasichai/b'], skipped: [] })
    assert.deepEqual(publishes(calls), [
      { args: ['publish', '--tag', 'dev'], dir: 'a' },
      { args: ['publish', '--tag', 'dev'], dir: 'b' }
    ])
    assert.equal(registry['@wasichai/a'].latest, '0.3.1')
  })
})

test('never touches a private package', () => {
  withFixture((packagesRoot) => {
    const { npm, calls } = fakeNpm(released())
    publishPackages({ packagesRoot, version: VERSION, distTag: 'dev', npm, log: () => {} })
    assert.ok(!calls.some(({ dir, args }) => dir === 'smoke' || args.some((arg) => arg.includes('smoke'))))
  })
})

test('skips a version already on the registry, so a re-run completes a partial upload', () => {
  withFixture((packagesRoot) => {
    const registry = released()
    registry['@wasichai/a'].versions.push(VERSION)
    const { npm, calls } = fakeNpm(registry)
    const lines = []
    const result = publishPackages({ packagesRoot, version: VERSION, distTag: 'dev', npm, log: (line) => lines.push(line) })
    assert.deepEqual(result, { published: ['@wasichai/b'], skipped: ['@wasichai/a'] })
    assert.deepEqual(publishes(calls), [{ args: ['publish', '--tag', 'dev'], dir: 'b' }])
    assert.ok(lines.includes(`@wasichai/a@${VERSION} already published, skipped`), lines.join('\n'))
  })
})

test('latest left alone by the publish passes', () => {
  withFixture((packagesRoot) => {
    const { npm, calls } = fakeNpm(released())
    assert.doesNotThrow(() => publishPackages({ packagesRoot, version: VERSION, distTag: 'dev', npm, log: () => {} }))
    assert.ok(!calls.some(({ args }) => args[0] === 'dist-tag'))
  })
})

test('a publish that moves latest gets it restored, then stops the run', () => {
  withFixture((packagesRoot) => {
    const { npm, calls, registry } = fakeNpm(released(), { publishMovesLatest: true })
    assert.throws(
      () => publishPackages({ packagesRoot, version: VERSION, distTag: 'dev', npm, log: () => {} }),
      /^Error: publish-packages: @wasichai\/a@1\.0\.0-dev\.0 moved latest from 0\.3\.1 to 1\.0\.0-dev\.0; latest restored to 0\.3\.1$/
    )
    assert.equal(registry['@wasichai/a'].latest, '0.3.1')
    assert.deepEqual(
      calls.filter(({ args }) => args[0] === 'dist-tag'),
      [{ args: ['dist-tag', 'add', '@wasichai/a@0.3.1', 'latest'], dir: 'a' }]
    )
    assert.deepEqual(publishes(calls), [{ args: ['publish', '--tag', 'dev'], dir: 'a' }])
  })
})

test('a first publish that sets latest has nothing to restore and stops the run', () => {
  withFixture((packagesRoot) => {
    const { npm, calls } = fakeNpm({})
    assert.throws(
      () => publishPackages({ packagesRoot, version: VERSION, distTag: 'dev', npm, log: () => {} }),
      /^Error: publish-packages: @wasichai\/a@1\.0\.0-dev\.0 moved latest from \(none\) to 1\.0\.0-dev\.0; no earlier latest to restore/
    )
    assert.ok(!calls.some(({ args }) => args[0] === 'dist-tag'))
    assert.deepEqual(publishes(calls), [{ args: ['publish', '--tag', 'dev'], dir: 'a' }])
  })
})

test('a release under latest moves latest without the guard', () => {
  withFixture((packagesRoot) => {
    const { npm, registry } = fakeNpm(released())
    publishPackages({ packagesRoot, version: VERSION, distTag: 'latest', npm, log: () => {} })
    assert.equal(registry['@wasichai/b'].latest, VERSION)
  })
})

test('a failed publish stops the run and names the package', () => {
  withFixture((packagesRoot) => {
    const { npm, calls } = fakeNpm(released(), { failPublish: '@wasichai/a' })
    assert.throws(
      () => publishPackages({ packagesRoot, version: VERSION, distTag: 'dev', npm, log: () => {} }),
      /^Error: publish-packages: npm publish @wasichai\/a@1\.0\.0-dev\.0 failed: npm error code E403/
    )
    assert.equal(publishes(calls).length, 1)
  })
})

test('refuses packages whose version is not the release one, before any upload', () => {
  const packagesRoot = fixture('0.3.1')
  try {
    const { npm, calls } = fakeNpm(released())
    assert.throws(
      () => publishPackages({ packagesRoot, version: VERSION, distTag: 'dev', npm, log: () => {} }),
      /^Error: publish-packages: @wasichai\/a has version 0\.3\.1, expected 1\.0\.0-dev\.0 \(run set-version\.mjs first\)$/
    )
    assert.deepEqual(calls, [])
  } finally {
    rmSync(packagesRoot, { recursive: true, force: true })
  }
})
