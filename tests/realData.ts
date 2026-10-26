import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { buildDataset, ROOT } from '../scripts/dataset'
import type { Dataset } from '../src/engine/schema'

/**
 * The real dataset for tests, read from the bundle `npm run data` writes (src/generated/real.json)
 * instead of rebuilding it from ~4,000 YAML files: a build takes ~4 s of CPU and ~150 MB, a parse
 * ~0.1 s. `npm test` runs `npm run data` first, so the bundle is fresh there.
 * tests/realData.test.ts checks it stays the same as buildDataset('real').
 *
 * One object per test file (Vitest isolates files), shared by every test in it, so the engine's
 * per-dataset caches hit across tests. Treat it as read-only: copy before changing anything.
 *
 * When the bundle is missing or older than its sources (data/real, scripts/dataset.ts and what it
 * imports) — say after editing data and running one test file — it falls back to building, as
 * before, and says so once.
 */
export const REAL_JSON = join(ROOT, 'src', 'generated', 'real.json')

/** Newest modification time under a file or directory (directories count, so deletions do too). */
function newest(path: string): number {
  const st = statSync(path)
  if (!st.isDirectory()) return st.mtimeMs
  return readdirSync(path).reduce((m, name) => Math.max(m, newest(join(path, name))), st.mtimeMs)
}

/** scripts/dataset.ts and every repo file it imports, transitively: a schema change changes the output. */
function buildSources(): string[] {
  const seen = new Set<string>()
  const visit = (file: string) => {
    if (seen.has(file) || !existsSync(file)) return
    seen.add(file)
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/\bfrom\s+'(\.{1,2}\/[^']+)'/g)) {
      const target = resolve(dirname(file), spec!)
      visit(target.endsWith('.ts') ? target : `${target}.ts`)
    }
  }
  visit(join(ROOT, 'scripts', 'dataset.ts'))
  return [...seen]
}

/** Whether src/generated/real.json exists and is newer than everything it is built from. */
export function realJsonIsFresh(): boolean {
  if (!existsSync(REAL_JSON)) return false
  const built = statSync(REAL_JSON).mtimeMs
  return [join(ROOT, 'data', 'real'), ...buildSources()].every((p) => newest(p) <= built)
}

let real: Dataset | undefined

/** The real dataset: the same shape as buildDataset('real').dataset. Read-only, shared per file. */
export function realData(): Dataset {
  if (real) return real
  if (realJsonIsFresh()) {
    real = JSON.parse(readFileSync(REAL_JSON, 'utf8')) as Dataset
    return real
  }
  process.stderr.write('realData(): src/generated/real.json is missing or older than data/real, building the real dataset instead (slow). Run `npm run data` to speed tests up.\n')
  const { dataset, errors } = buildDataset('real')
  if (errors.length) throw new Error(`data/real has errors (run \`npm run data\` to see them):\n${errors.join('\n')}`)
  real = dataset
  return real
}
