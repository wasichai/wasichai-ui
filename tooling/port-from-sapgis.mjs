#!/usr/bin/env node
// copies one sapgis frontend file into a wasichai package and rewrites what moved: `@/` specifiers
// (imports, vi.mock, typeof import), sapgis names, and the i18n side-effect imports the registry
// replaced. anything it cannot place is left alone and reported as MANUAL.
// usage: node tooling/port-from-sapgis.mjs <path under sapgis/frontend/src> <repo-relative target>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SAPGIS_SRC = process.env.SAPGIS_SRC ?? resolve(REPO_ROOT, '../sapgis/frontend/src')
const CORE_SRC = join(REPO_ROOT, 'packages/core/src')
const PACKAGES_DIR = join(REPO_ROOT, 'packages')

// shared code that became its own package
const PACKAGE_MAP = [
  [/^@\/components\/ui\/.+$/, '@wasichai/ui'],
  [/^@\/lib\/utils$/, '@wasichai/ui'],
  [/^@\/test\/render$/, '@wasichai/testing']
]

// sapgis location -> location under core/src. the specific rules win over MODULE_MAP (builder files
// that stayed in core); the generic ones only apply after it.
const CORE_SPECIFIC = [
  [/^@\/lib\/api$/, 'api/client'],
  [/^@\/lib\/queries$/, 'queries'],
  [/^@\/lib\/metadata-to-zod$/, 'lib/metadata-to-zod'],
  [/^@\/types\/metadata$/, 'types/metadata'],
  [/^@\/app\/auth$/, 'auth/AuthProvider'],
  [/^@\/components\/layout\/AppShell$/, 'shell/PageHeader'],
  [/^@\/features\/history\/types$/, 'types/audit'],
  [/^@\/features\/views\/viewColumns$/, 'features/records/viewColumns'],
  [/^@\/features\/pages\/builder\/templates$/, 'components/page-renderer/layout']
]
const CORE_GENERIC = [
  [/^@\/components\/(.+)$/, 'components/$1'],
  [/^@\/features\/(.+)$/, 'features/$1']
]

// sapgis location -> [P5 package, location under its src]. resolves only inside that package: from
// anywhere else it would be a cross-module import, which wasichai forbids, so a human decides (MANUAL)
const MODULE_MAP = [
  [/^@\/components\/map\/(.+)$/, 'gis', 'components/$1'],
  [/^@\/lib\/(geo|wms)$/, 'gis', 'lib/$1'],
  [/^@\/features\/map\/(.+)$/, 'gis', 'map/$1'],
  [/^@\/features\/layers\/(.+)$/, 'gis', 'layers/$1'],
  [/^@\/features\/workflows\/(.+)$/, 'workflow', '$1'],
  [/^@\/features\/automations\/(.+)$/, 'automation', '$1'],
  [/^@\/features\/documents\/(.+)$/, 'documents', '$1'],
  [/^@\/features\/history\/IssuedDocumentLink$/, 'documents', 'IssuedDocumentLink'],
  [/^@\/features\/pages\/(.+)$/, 'pages', '$1'],
  [/^@\/features\/views\/(.+)$/, 'views', '$1'],
  [/^@\/features\/forms\/(.+)$/, 'forms', '$1'],
  [/^@\/features\/assistant\/(.+)$/, 'agent', '$1']
]

// translation bundles load through the registry now, never by importing a file for its side effect
const I18N_SIDE_EFFECT = /^import '(?:@\/lib\/i18n|@\/features\/[^']+\/i18n|\.\/i18n)'\n/gm
const RENAMES = [
  [/sapgis/g, 'wasichai'],
  [/Sapgis/g, 'Wasichai'],
  [/SAPGIS/g, 'Wasichai']
]

const isInside = (dir, file) => !relative(dir, file).startsWith('..')

function relativeImport(targetFile, absolute) {
  const path = relative(dirname(targetFile), absolute)
  return path.startsWith('.') ? path : `./${path}`
}

export function mapSpecifier(specifier, targetFile) {
  for (const [pattern, replacement] of PACKAGE_MAP) if (pattern.test(specifier)) return replacement
  // outside core (P5 packages) everything core owns comes from its public api
  const toCore = (pattern, replacement) =>
    isInside(CORE_SRC, targetFile) ? relativeImport(targetFile, join(CORE_SRC, specifier.replace(pattern, replacement))) : '@wasichai/core'
  for (const [pattern, replacement] of CORE_SPECIFIC) if (pattern.test(specifier)) return toCore(pattern, replacement)
  for (const [pattern, pkg, replacement] of MODULE_MAP) {
    if (!pattern.test(specifier)) continue
    const src = join(PACKAGES_DIR, pkg, 'src')
    return isInside(src, targetFile) ? relativeImport(targetFile, join(src, specifier.replace(pattern, replacement))) : null
  }
  for (const [pattern, replacement] of CORE_GENERIC) if (pattern.test(specifier)) return toCore(pattern, replacement)
  return null
}

export function portSource(source, targetFile) {
  const unmapped = []
  let text = source.replace(I18N_SIDE_EFFECT, '')
  text = text.replace(/(['"])(@\/[^'"]+)\1/g, (whole, quote, specifier) => {
    const mapped = mapSpecifier(specifier, targetFile)
    if (mapped === null) {
      unmapped.push(specifier)
      return whole
    }
    return `${quote}${mapped}${quote}`
  })
  for (const [pattern, replacement] of RENAMES) text = text.replace(pattern, replacement)
  return { text, unmapped }
}

function main([from, to]) {
  if (!from || !to) {
    console.error('usage: port-from-sapgis.mjs <path under sapgis/frontend/src> <repo-relative target>')
    process.exit(1)
  }
  const target = resolve(REPO_ROOT, to)
  const { text, unmapped } = portSource(readFileSync(join(SAPGIS_SRC, from), 'utf8'), target)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, text)
  for (const specifier of unmapped) console.warn(`MANUAL: ${to} still imports ${specifier}`)
  console.log(`ported ${from} -> ${to}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
