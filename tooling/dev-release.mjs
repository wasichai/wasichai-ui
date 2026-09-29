#!/usr/bin/env node
// dev pre-releases: X.Y.0-dev.N from the dev branch, under the npm dist-tag dev, never latest.
// a human asks `next` which tag to push; release-dev.yml turns the pushed tag back into a version with `version-of`.
// usage: node tooling/dev-release.mjs next | version-of <tag> | dist-tag <version>
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// semver numbers: no leading zero, or npm refuses the version halfway through the upload
const NUMBER = '(0|[1-9]\\d*)'
const PLAIN = new RegExp(`^${NUMBER}\\.${NUMBER}\\.${NUMBER}$`)
const DEV = new RegExp(`^${NUMBER}\\.${NUMBER}\\.${NUMBER}-dev\\.${NUMBER}$`)

// the next minor: bump-minor-pre-major is on, so main's next release is that minor too
export function nextDevVersion(baseVersion, tags) {
  const match = PLAIN.exec(baseVersion)
  if (!match) throw new Error(`dev-release: needs a plain version, got '${baseVersion}'`)
  const line = `${match[1]}.${Number(match[2]) + 1}.0`
  const taken = tags
    .map((tag) => tag.replace(/^v/, ''))
    .filter((version) => version.startsWith(`${line}-dev.`) && DEV.test(version))
    .map((version) => Number(DEV.exec(version)[4]))
  return `${line}-dev.${Math.max(-1, ...taken) + 1}`
}

// a pushed tag is typed by hand: anything but vX.Y.Z-dev.N stops the release before it builds
export function devVersionOfTag(tag) {
  const version = typeof tag === 'string' && tag.startsWith('v') ? tag.slice(1) : ''
  if (!DEV.test(version)) throw new Error(`dev-release: '${tag}' is not a dev tag (vX.Y.Z-dev.N)`)
  return version
}

// a dev build never becomes latest; rc, alpha and the like have no dist-tag yet
export function distTagFor(version) {
  if (PLAIN.test(version)) return 'latest'
  if (DEV.test(version)) return 'dev'
  throw new Error(`dev-release: no dist-tag for '${version}'`)
}

function run([command, arg]) {
  if (command === 'next') {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const manifest = JSON.parse(readFileSync(join(repoRoot, '.release-please-manifest.json'), 'utf8'))
    // local tags only: fetch them first, or the counter repeats one already pushed
    const tags = execFileSync('git', ['tag', '--list', 'v*-dev.*'], { cwd: repoRoot, encoding: 'utf8' }).split('\n').filter(Boolean)
    return nextDevVersion(manifest['.'], tags)
  }
  if (command === 'version-of' && arg !== undefined) return devVersionOfTag(arg)
  if (command === 'dist-tag' && arg !== undefined) return distTagFor(arg)
  throw new Error('dev-release: usage: dev-release.mjs next | version-of <tag> | dist-tag <version>')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(run(process.argv.slice(2)))
  } catch (err) {
    // the message, not a stack: the workflow log should say why the tag was refused
    console.error(err.message.startsWith('dev-release: ') ? err.message : `dev-release: ${err.message}`)
    process.exit(1)
  }
}
