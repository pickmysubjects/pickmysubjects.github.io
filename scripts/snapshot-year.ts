/**
 * Freezes one Handbook year before the next year's facts are typed over it, so "What changed"
 * can compare them later (see MAINTENANCE.md).
 *
 *   npx tsx scripts/snapshot-year.ts 2026     writes data/real/snapshots/2026.json
 *
 * Run it before the first page of the next year goes in. It refuses when the data already has a
 * later year (the snapshot would hold new facts under the old year's name) or the file exists;
 * --force writes it anyway.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDataset, ROOT } from './dataset'
import { snapshotOf } from '../src/engine/yearDiff'
import { SNAPSHOT_DIR } from './changes'
import { latestDataYear } from '../src/engine/dataYear'

const year = Number(process.argv[2])
if (!Number.isInteger(year) || year < 2000) {
  console.error('Usage: npx tsx scripts/snapshot-year.ts <year>')
  process.exit(1)
}
const { dataset, errors } = buildDataset('real')
if (errors.length) {
  console.error(`Fix the data first (${errors.length} error(s)): npm run data`)
  process.exit(1)
}
const force = process.argv.includes('--force')
const newest = latestDataYear(dataset.subjects)
if (newest > year && !force) {
  console.error(`The data already has ${newest} facts: a ${year} snapshot taken now would mix them in. Snapshot before importing ${year + 1} (or --force).`)
  process.exit(1)
}
const dir = SNAPSHOT_DIR(ROOT)
if (existsSync(join(dir, `${year}.json`)) && !force) {
  console.error(`data/real/snapshots/${year}.json already exists (--force to replace it).`)
  process.exit(1)
}
mkdirSync(dir, { recursive: true })
const snap = snapshotOf(dataset, year)
writeFileSync(join(dir, `${year}.json`), `${JSON.stringify(snap, null, 1)}\n`)
console.log(`✓ data/real/snapshots/${year}.json: ${Object.keys(snap.subjects).length} subjects, ${Object.keys(snap.components).length} components`)
