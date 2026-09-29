import assert from 'node:assert/strict'
import { test } from 'node:test'

import { devVersionOfTag, distTagFor, nextDevVersion } from './dev-release.mjs'

test('nextDevVersion: next minor, next free counter', () => {
  assert.equal(nextDevVersion('0.3.1', []), '0.4.0-dev.0')
  assert.equal(nextDevVersion('0.3.1', ['v0.4.0-dev.0', 'v0.4.0-dev.1']), '0.4.0-dev.2')
  // a gap is never refilled: the highest counter wins
  assert.equal(nextDevVersion('0.3.1', ['v0.4.0-dev.0', 'v0.4.0-dev.2']), '0.4.0-dev.3')
  assert.equal(nextDevVersion('0.3.1', ['v0.4.0-dev.0', 'v0.5.0-dev.4']), '0.4.0-dev.1')
  assert.equal(nextDevVersion('1.2.3', []), '1.3.0-dev.0')
})

test('nextDevVersion: counters compare as numbers, not strings', () => {
  assert.equal(nextDevVersion('0.3.1', ['v0.4.0-dev.9', 'v0.4.0-dev.10']), '0.4.0-dev.11')
})

test('nextDevVersion: ignores tags that are not dev versions', () => {
  assert.equal(nextDevVersion('0.3.1', ['v0.4.0-dev.x', 'v0.4.0-dev.', 'v0.4.0-dev.01', 'v0.3.1']), '0.4.0-dev.0')
  assert.equal(nextDevVersion('0.3.1', ['v0.4.0-dev.x', 'v0.4.0-dev.4']), '0.4.0-dev.5')
})

test('nextDevVersion: base must be a plain version', () => {
  assert.throws(() => nextDevVersion('0.4.0-dev.1', []), /plain version/)
  assert.throws(() => nextDevVersion('0.4.0-rc.1', []), /plain version/)
  assert.throws(() => nextDevVersion('0.4.0-alpha.1', []), /plain version/)
})

test('devVersionOfTag: a dev tag gives its version', () => {
  assert.equal(devVersionOfTag('v0.4.0-dev.3'), '0.4.0-dev.3')
  assert.equal(devVersionOfTag('v1.12.0-dev.10'), '1.12.0-dev.10')
})

test('devVersionOfTag: refuses anything else', () => {
  for (const tag of ['0.4.0-dev.3', 'v0.4.0', 'v0.4.0-rc.1', 'v0.4.0-dev.x', 'v0.4.0-dev.01', 'v0.4.0-dev.3-1', 'refs/tags/v0.4.0-dev.3', '', undefined]) {
    assert.throws(() => devVersionOfTag(tag), /^Error: dev-release: .* is not a dev tag \(vX\.Y\.Z-dev\.N\)$/, String(tag))
  }
})

test('distTagFor: dev builds under dev, releases under latest', () => {
  assert.equal(distTagFor('0.4.0-dev.3'), 'dev')
  assert.equal(distTagFor('0.4.0'), 'latest')
  assert.equal(distTagFor('1.2.3'), 'latest')
})

test('distTagFor: refuses any other prerelease', () => {
  assert.throws(() => distTagFor('0.4.0-rc.1'), /^Error: dev-release: no dist-tag for '0\.4\.0-rc\.1'$/)
  assert.throws(() => distTagFor('0.4.0-alpha.1'), /^Error: dev-release: no dist-tag for '0\.4\.0-alpha\.1'$/)
  assert.throws(() => distTagFor('something'), /^Error: dev-release: no dist-tag for 'something'$/)
})
