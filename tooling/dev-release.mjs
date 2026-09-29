#!/usr/bin/env node
// compute next dev version and dist-tag for pre-release builds from dev branch.
// dev builds ride the next minor: npm tag them as 'dev', they never become 'latest'.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// matches: plain versions (no pre-release), e.g. "0.3.1"
const PLAIN = /^(\d+)\.(\d+)\.(\d+)$/

// matches: dev versions with dev counter, e.g. "0.4.0-dev.3" -> captures "3"
const DEV = /^\d+\.\d+\.\d+-dev\.(\d+)$/

// compute next dev version given a base version and list of existing tags.
// base version must be plain (x.y.z), never a pre-release.
// dev builds ride the next minor: bump minor and set patch to 0, then find next counter.
export function nextDevVersion(baseVersion, tags) {
  const match = PLAIN.exec(baseVersion)
  if (!match) throw new Error(`dev-release: needs a plain version, got '${baseVersion}'`)
  const line = `${match[1]}.${Number(match[2]) + 1}.0`
  const taken = tags
    .map((tag) => tag.replace(/^v/, ''))
    .filter((v) => v.startsWith(`${line}-dev.`))
    .map((v) => Number(DEV.exec(v)?.[1] ?? -1))
  return `${line}-dev.${Math.max(-1, ...taken) + 1}`
}

// determine dist-tag for a version: 'dev' for -dev.N, 'latest' for plain x.y.z.
// other formats (rc, alpha, beta, etc) are not supported for publishing.
export function distTagFor(version) {
  if (PLAIN.test(version)) return 'latest'
  if (DEV.test(version)) return 'dev'
  throw new Error(`dev-release: no dist-tag for '${version}'`)
}

// CLI entry point only when run directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repoRoot = dirname(fileURLToPath(import.meta.url)) + '/..'
  const subcommand = process.argv[2]

  if (subcommand === 'next') {
    // read manifest for base version and git tags for existing dev releases.
    const manifest = JSON.parse(readFileSync(join(repoRoot, '.release-please-manifest.json'), 'utf8'))
    const baseVersion = manifest['.']
    const tags = execFileSync('git', ['tag', '--list', 'v*-dev.*'], {
      cwd: repoRoot,
      encoding: 'utf8'
    })
      .trim()
      .split('\n')
      .filter(Boolean)
    console.log(nextDevVersion(baseVersion, tags))
  } else if (subcommand === 'dist-tag') {
    const version = process.argv[3]
    if (!version) {
      console.error('usage: dev-release.mjs dist-tag <version>')
      process.exit(1)
    }
    console.log(distTagFor(version))
  } else {
    console.error('usage: dev-release.mjs <next|dist-tag>')
    process.exit(1)
  }
}
