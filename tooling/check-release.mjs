#!/usr/bin/env node
// guards a release before anything is uploaded: which npm packages would be published, whether
// release-please bumps each of them, and what their tarballs would hold once set-version.mjs ran.
// publish.yml runs it right before `npm publish`, ci.yml on every pull request.
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { setVersion } from './set-version.mjs'

// the public set, by name. a new package fails the check until someone adds it here on purpose.
export const EXPECTED_PUBLIC = [
  '@wasichai/agent',
  '@wasichai/automation',
  '@wasichai/core',
  '@wasichai/documents',
  '@wasichai/forms',
  '@wasichai/gis',
  '@wasichai/pages',
  '@wasichai/testing',
  '@wasichai/ui',
  '@wasichai/views',
  '@wasichai/workflow'
]

const DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies']

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readPackage(dir) {
  try {
    return readJson(join(dir, 'package.json'))
  } catch {
    return null // a folder without package.json is not a package
  }
}

export function publicPackages(packagesRoot) {
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packagesRoot, entry.name))
    .map((dir) => ({ dir, pkg: readPackage(dir) }))
    .filter(({ pkg }) => pkg && pkg.private !== true)
}

// the files a consumer's import resolves to: main, types and every exports target
function entryPoints(pkg) {
  const targets = [pkg.main, pkg.types]
  const walk = (value) => {
    if (typeof value === 'string') targets.push(value)
    else if (value && typeof value === 'object') Object.values(value).forEach(walk)
  }
  walk(pkg.exports)
  return [...new Set(targets.filter(Boolean).map((t) => t.replace(/^\.\//, '')))]
}

export function checkReleaseConfig(repoRoot, expected = EXPECTED_PUBLIC) {
  const problems = []
  const packagesRoot = join(repoRoot, 'packages')
  const published = publicPackages(packagesRoot)
  const names = published.map(({ pkg }) => pkg.name)

  for (const name of names) if (!expected.includes(name)) problems.push(`${name} would be published but is not in the expected public set`)
  for (const name of expected) if (!names.includes(name)) problems.push(`${name} is expected to be published but is missing or private`)

  const config = readJson(join(repoRoot, 'release-please-config.json'))
  const bumped = (config.packages?.['.']?.['extra-files'] ?? []).map((file) => (typeof file === 'string' ? file : file.path))
  const publishedFiles = published.map(({ dir }) => relative(repoRoot, join(dir, 'package.json')))
  for (const file of publishedFiles) if (!bumped.includes(file)) problems.push(`${file} is not bumped by release-please (extra-files)`)
  for (const file of bumped) {
    if (file.startsWith('packages/') && !publishedFiles.includes(file)) problems.push(`release-please bumps ${file}, which is not a public package`)
  }

  return problems
}

export function npmPack(dir) {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: dir, encoding: 'utf8' })
  return JSON.parse(out)[0].files.map((file) => file.path)
}

// what publish.yml does, on a throwaway copy: set-version, then pack every public package
export function packDryRun(repoRoot, version, { pack = npmPack } = {}) {
  if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`pack dry run needs a release version, got '${version}'`)
  const problems = []
  const tmp = mkdtempSync(join(tmpdir(), 'wasichai-pack-'))
  try {
    const copy = join(tmp, 'packages')
    cpSync(join(repoRoot, 'packages'), copy, { recursive: true, filter: (src) => !src.split(/[\\/]/).includes('node_modules') })
    setVersion(version, copy)
    for (const { dir, pkg } of publicPackages(copy)) {
      if (pkg.version !== version) problems.push(`${pkg.name} has version ${pkg.version}, expected ${version}`)
      for (const field of DEP_FIELDS) {
        for (const [name, range] of Object.entries(pkg[field] ?? {})) {
          if (name.startsWith('@wasichai/') && range !== version) problems.push(`${pkg.name} ${field} ${name}@${range}, expected ${version}`)
        }
      }
      const files = pack(dir)
      for (const needed of ['package.json', ...entryPoints(pkg).filter((p) => p !== 'package.json')]) {
        if (!files.includes(needed)) problems.push(`${pkg.name} tarball lacks ${needed}`)
      }
      if (files.some((file) => file.startsWith('src/'))) problems.push(`${pkg.name} tarball ships src/`)
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const args = process.argv.slice(2)
  const problems = checkReleaseConfig(repoRoot)
  const at = args.indexOf('--pack')
  if (at >= 0) problems.push(...packDryRun(repoRoot, args[at + 1]))
  for (const problem of problems) console.error(`check-release: ${problem}`)
  if (problems.length > 0) process.exit(1)
  console.log('check-release: ok')
}
