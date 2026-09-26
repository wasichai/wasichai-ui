#!/usr/bin/env node
// writes the build and test wiring of every P5 module package, the same wiring core has: package.json,
// tsconfigs, vite config, jest-dom setup and an empty entry. sources come later, one task per package;
// an existing src/index.ts or setup file is never overwritten, so re-running it is safe.
// usage: node tooling/scaffold-module.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PACKAGES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../packages')

// versions copied from the original app's frontend/package.json exactly
export const MODULES = [
  {
    name: 'gis',
    description: 'Wasichai GIS module: map and layers pages, the GEOMETRY field and the MAP page component',
    dependencies: { 'maplibre-gl': '6.10.0', 'terra-draw': '1.33.0', 'terra-draw-maplibre-gl-adapter': '1.4.1' }
  },
  {
    name: 'workflow',
    description: 'Wasichai workflow module: builder, canvas, WORKFLOW page component and TRANSITION action',
    dependencies: { '@xyflow/react': '12.11.6' }
  },
  { name: 'automation', description: 'Wasichai automation module: rule builder and run log', dependencies: {} },
  {
    name: 'documents',
    description: 'Wasichai documents module: document types, template editor, issued documents and print page',
    dependencies: { '@tiptap/core': '3', '@tiptap/react': '3', '@tiptap/starter-kit': '3' },
    css: ['print.css']
  },
  { name: 'pages', description: 'Wasichai page builder module', dependencies: { '@dnd-kit/core': '6.3.1' } },
  { name: 'views', description: 'Wasichai list view builder module', dependencies: {} },
  { name: 'forms', description: 'Wasichai form builder module', dependencies: {} },
  { name: 'agent', description: 'Wasichai assistant module', dependencies: {} }
]

export function moduleManifest(spec, core) {
  const css = spec.css ?? []
  return {
    name: `@wasichai/${spec.name}`,
    version: core.version,
    description: spec.description,
    type: 'module',
    files: ['dist', 'README.md'],
    // a stylesheet is imported for its effect; everything else may be tree-shaken
    sideEffects: css.length ? css.map((file) => `./dist/${file}`) : false,
    main: './dist/index.js',
    module: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      ...Object.fromEntries(css.map((file) => [`./${file}`, `./dist/${file}`])),
      './package.json': './package.json'
    },
    publishConfig: core.publishConfig,
    scripts: {
      lint: core.scripts.lint,
      test: core.scripts.test,
      build: [core.scripts.build, ...css.map((file) => `cp src/${file} dist/${file}`)].join(' && ')
    },
    dependencies: { 'lucide-react': core.dependencies['lucide-react'], ...spec.dependencies },
    peerDependencies: { '@wasichai/core': '*', '@wasichai/ui': '*', ...core.peerDependencies },
    devDependencies: core.devDependencies
  }
}

function tsconfig(name) {
  return {
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      noEmit: true,
      types: ['node', 'vitest/globals', '@testing-library/jest-dom'],
      paths: {
        '@wasichai/ui': ['../ui/src/index.ts'],
        '@wasichai/core': ['../core/src/index.ts'],
        '@wasichai/testing': ['../testing/src/index.ts'],
        [`@wasichai/${name}`]: ['./src/index.ts']
      }
    },
    include: ['src', 'vite.config.ts']
  }
}

// no paths: declarations resolve siblings through node_modules, i.e. their built dist
const TSCONFIG_BUILD = {
  extends: '../../tsconfig.base.json',
  compilerOptions: { declaration: true, emitDeclarationOnly: true, outDir: 'dist', rootDir: 'src', types: [] },
  include: ['src'],
  exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/test']
}

function viteConfig(name) {
  return `import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import pkg from './package.json' with { type: 'json' }

const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)]
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: here('./src/index.ts'), formats: ['es'], fileName: 'index' },
    rolldownOptions: {
      // deep imports too (a library's css, its worker file): the consumer's bundler resolves them
      external: (id: string) => external.some((dep) => id === dep || id.startsWith(\`\${dep}/\`))
    },
    sourcemap: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // tests run against sibling sources, so nothing has to be built first
    alias: {
      '@wasichai/ui': here('../ui/src/index.ts'),
      '@wasichai/core': here('../core/src/index.ts'),
      '@wasichai/testing': here('../testing/src/index.ts'),
      '@wasichai/${name}': here('./src/index.ts')
    }
  }
})
`
}

const json = (value) => `${JSON.stringify(value, null, 4)}\n`

function write(path, text, { keep = false } = {}) {
  if (keep && existsSync(path)) return
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

function main() {
  const core = JSON.parse(readFileSync(join(PACKAGES_DIR, 'core/package.json'), 'utf8'))
  for (const spec of MODULES) {
    const dir = join(PACKAGES_DIR, spec.name)
    write(join(dir, 'package.json'), json(moduleManifest(spec, core)))
    write(join(dir, 'tsconfig.json'), json(tsconfig(spec.name)))
    write(join(dir, 'tsconfig.build.json'), json(TSCONFIG_BUILD))
    write(join(dir, 'vite.config.ts'), viteConfig(spec.name))
    write(join(dir, 'src/test/setup.ts'), "import '@testing-library/jest-dom/vitest'\n", { keep: true })
    write(join(dir, 'src/index.ts'), '// the package task fills this in\nexport {}\n', { keep: true })
    // a css file is a build target (see moduleManifest's `scripts.build`): write a placeholder so
    // `yarn build` never fails on a missing source file before its owning task fills it in
    for (const file of spec.css ?? []) write(join(dir, `src/${file}`), `/* ${spec.name}: Task 5 fills this in */\n`, { keep: true })
    console.log(`scaffolded @wasichai/${spec.name}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
