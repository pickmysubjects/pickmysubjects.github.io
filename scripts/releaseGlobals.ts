// Scripts run outside Vite, so `define` doesn't apply: set the same two build-time globals here.
// Import this before anything that imports src/release.ts.
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
const g = globalThis as Record<string, unknown>
g.__APP_VERSION__ ??= pkg.version
g.__APP_UPDATED__ ??= new Date().toISOString()
