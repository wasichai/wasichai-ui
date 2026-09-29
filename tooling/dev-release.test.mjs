// test suite for tooling/dev-release.mjs: compute next dev version and dist-tags.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { distTagFor, nextDevVersion } from './dev-release.mjs'

test('nextDevVersion: base version to next dev version', () => {
  // base 0.3.1 with no tags -> bump minor, start at dev.0
  assert.equal(nextDevVersion('0.3.1', []), '0.4.0-dev.0')

  // reuse existing dev.0 and dev.1 -> next is dev.2
  assert.equal(nextDevVersion('0.3.1', ['v0.4.0-dev.0', 'v0.4.0-dev.1']), '0.4.0-dev.2')

  // skip dev.1 (not present) -> next is dev.3
  assert.equal(nextDevVersion('0.3.1', ['v0.4.0-dev.0', 'v0.4.0-dev.2']), '0.4.0-dev.3')

  // tags of other version lines are ignored
  assert.equal(nextDevVersion('0.3.1', ['v0.4.0-dev.0', 'v0.5.0-dev.4']), '0.4.0-dev.1')

  // different base version: 1.2.3 -> 1.3.0-dev.0
  assert.equal(nextDevVersion('1.2.3', []), '1.3.0-dev.0')
})

test('nextDevVersion: rejects non-plain versions', () => {
  // dev version as base throws
  assert.throws(
    () => nextDevVersion('0.4.0-dev.1', []),
    (err) => err.message.includes('plain version')
  )

  // rc version as base throws
  assert.throws(
    () => nextDevVersion('0.4.0-rc.1', []),
    (err) => err.message.includes('plain version')
  )

  // pre-release as base throws
  assert.throws(
    () => nextDevVersion('0.4.0-alpha.1', []),
    (err) => err.message.includes('plain version')
  )
})

test('distTagFor: version to dist-tag', () => {
  // dev version -> dev tag
  assert.equal(distTagFor('0.4.0-dev.3'), 'dev')

  // plain version -> latest tag
  assert.equal(distTagFor('0.4.0'), 'latest')

  // another plain version
  assert.equal(distTagFor('1.2.3'), 'latest')
})

test('distTagFor: rejects unknown version formats', () => {
  // rc version throws
  assert.throws(
    () => distTagFor('0.4.0-rc.1'),
    (err) => err.message.includes('no dist-tag')
  )

  // alpha version throws
  assert.throws(
    () => distTagFor('0.4.0-alpha.1'),
    (err) => err.message.includes('no dist-tag')
  )

  // arbitrary string throws
  assert.throws(() => distTagFor('something'))
})
