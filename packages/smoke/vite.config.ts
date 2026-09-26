import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const PACKAGES = ['ui', 'core', 'testing', 'gis', 'workflow', 'automation', 'documents', 'pages', 'views', 'forms', 'agent']

// test-only workspace: every package from its sources, nothing built first
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    alias: Object.fromEntries(PACKAGES.map((name) => [`@wasichai/${name}`, here(`../${name}/src/index.ts`)]))
  }
})
