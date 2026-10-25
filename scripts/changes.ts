/**
 * "What changed in <year>": compares the newest frozen year (data/real/snapshots/<year>.json, made
 * by scripts/snapshot-year.ts) with the data as it is now, once the data has the next year in it.
 *
 *   npx tsx scripts/changes.ts      prints the summary (build-data writes src/generated/changes.json)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { diffCounts, diffIsEmpty, diffYears, snapshotOf, type YearDiff, type YearSnapshot } from '../src/engine/yearDiff'
import type { Dataset } from '../src/engine/schema'

export const SNAPSHOT_DIR = (root: string, name = 'real') => join(root, 'data', name, 'snapshots')

/** The newest snapshot in a folder, or null. */
export function latestSnapshot(dir: string): YearSnapshot | null {
  if (!existsSync(dir)) return null
  const years = readdirSync(dir)
    .map((f) => /^(\d{4})\.json$/.exec(f)?.[1])
    .filter((y): y is string => !!y)
    .sort()
  const last = years.at(-1)
  return last ? (JSON.parse(readFileSync(join(dir, `${last}.json`), 'utf8')) as YearSnapshot) : null
}

/** Has anyone entered the year yet? Some subject lists when it runs that year. */
export function hasYear(data: Pick<Dataset, 'subjects'>, year: number): boolean {
  return Object.values(data.subjects).some((s) => s.offerings !== 'unknown' && s.offerings[String(year)] !== undefined)
}

/**
 * The diff from the newest snapshot to the next year, or null when there is nothing to show:
 * no snapshot, the next year not entered yet, or nothing different.
 */
export function buildChanges(data: Pick<Dataset, 'subjects' | 'components'>, dir: string): YearDiff | null {
  const before = latestSnapshot(dir)
  if (!before) return null
  const year = before.year + 1
  if (!hasYear(data, year)) return null
  const diff = diffYears(before, snapshotOf(data, year))
  return diffIsEmpty(diff) ? null : diff
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { buildDataset, ROOT } = await import('./dataset')
  const { dataset } = buildDataset('real')
  const diff = buildChanges(dataset, SNAPSHOT_DIR(ROOT))
  if (!diff) console.log('No changes page: no snapshot, the next year not entered yet, or nothing different.')
  else console.log(`${diff.from} → ${diff.to}:`, diffCounts(diff))
}
