#!/usr/bin/env node
// bumps every frontend package to one lockstep version and keeps internal @wasichai/* deps in sync.
// npm version only touches a package's own version, so publish.yml calls this instead.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies']

// rewrites every packages/*/package.json in place: own version, and any
// @wasichai/* dependency entry, to `version`. leaves external deps and `private` untouched -
// whether a private package gets published is publish.yml's call, not this script's.
export function setVersion(version, packagesRoot) {
  const entries = readdirSync(packagesRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())

  for (const entry of entries) {
    const pkgPath = join(packagesRoot, entry.name, 'package.json')
    let pkg
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    } catch {
      continue // no package.json in this dir (e.g. .gitkeep placeholder)
    }

    pkg.version = version
    for (const field of DEP_FIELDS) {
      const deps = pkg[field]
      if (!deps) continue
      for (const name of Object.keys(deps)) {
        if (name.startsWith('@wasichai/')) deps[name] = version
      }
    }

    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`)
  }
}

// CLI entry point only when run directly, so the test can import setVersion without side effects.
if (import.meta.url === `file://${process.argv[1]}`) {
  const version = process.argv[2]
  if (!version) {
    console.error('usage: set-version.mjs <version> [packagesRoot]')
    process.exit(1)
  }
  const packagesRoot = process.argv[3] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'packages')
  setVersion(version, packagesRoot)
}
