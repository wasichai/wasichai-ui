#!/usr/bin/env node
// publishes every public package at one version under one dist-tag. publish.yml runs it after set-version.mjs.
// a version already on the registry is skipped: re-running a failed upload finishes it instead of hitting E409.
// a publish under any tag but latest must leave latest alone; the registry moves it anyway on a first publish.
// usage: node tooling/publish-packages.mjs <version> <dist-tag>
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { publicPackages } from './check-release.mjs'

// '' when the package was never published: nothing to guard yet
function latestOf(npm, name, dir) {
  const view = npm(['view', name, 'dist-tags.latest'], { cwd: dir })
  if (view.status === 0) return view.stdout.trim()
  if (/\bE404\b/.test(view.stderr)) return ''
  throw new Error(`publish-packages: cannot read the latest of ${name}: ${view.stderr.trim()}`)
}

// npm(args, { cwd }) -> { status, stdout, stderr }: the CLI spawns npm, the tests fake it
export function publishPackages({ packagesRoot, version, distTag, npm, log = console.log }) {
  // folder order, like the shell loop this replaced
  const packages = publicPackages(packagesRoot).sort((a, b) => a.dir.localeCompare(b.dir))
  // the skip check asks for `version`, npm publishes package.json's: they must match before anything uploads
  for (const { pkg } of packages) {
    if (pkg.version !== version) throw new Error(`publish-packages: ${pkg.name} has version ${pkg.version}, expected ${version} (run set-version.mjs first)`)
  }

  const published = []
  const skipped = []
  const guard = distTag !== 'latest'
  for (const { dir, pkg } of packages) {
    const { name } = pkg
    const there = npm(['view', `${name}@${version}`, 'version'], { cwd: dir })
    if (there.status === 0 && there.stdout.trim() === version) {
      log(`${name}@${version} already published, skipped`)
      skipped.push(name)
      continue
    }

    const before = guard ? latestOf(npm, name, dir) : ''
    const publish = npm(['publish', '--tag', distTag], { cwd: dir })
    if (publish.status !== 0) throw new Error(`publish-packages: npm publish ${name}@${version} failed: ${publish.stderr.trim()}`)
    log(`${name}@${version} published under ${distTag}`)
    published.push(name)
    if (!guard) continue

    const after = latestOf(npm, name, dir)
    if (after === before) continue
    // stop at the first one: every later package would move latest the same way
    const moved = `publish-packages: ${name}@${version} moved latest from ${before || '(none)'} to ${after}`
    if (!before) throw new Error(`${moved}; no earlier latest to restore, it stays until the next release`)
    const restore = npm(['dist-tag', 'add', `${name}@${before}`, 'latest'], { cwd: dir })
    if (restore.status !== 0) throw new Error(`${moved}; restoring latest to ${before} failed: ${restore.stderr.trim()}`)
    throw new Error(`${moved}; latest restored to ${before}`)
  }
  return { published, skipped }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [version, distTag] = process.argv.slice(2)
  const packagesRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'packages')
  const npm = (args, { cwd }) => {
    const run = spawnSync('npm', args, { cwd, encoding: 'utf8' })
    return { status: run.status ?? 1, stdout: run.stdout ?? '', stderr: run.stderr || String(run.error ?? '') }
  }
  try {
    if (!version || !distTag) throw new Error('publish-packages: usage: publish-packages.mjs <version> <dist-tag>')
    const { published, skipped } = publishPackages({ packagesRoot, version, distTag, npm })
    console.log(`publish-packages: ${published.length} published, ${skipped.length} already there`)
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}
