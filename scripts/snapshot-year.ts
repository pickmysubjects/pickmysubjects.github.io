/**
 * Freezes one Handbook year before the next year's facts are typed over it, so "What changed"
 * can compare them later (see MAINTENANCE.md).
 *
 *   npx tsx scripts/snapshot-year.ts 2026     writes data/real/snapshots/2026.json
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDataset, ROOT } from './dataset'
import { snapshotOf } from '../src/engine/yearDiff'
import { SNAPSHOT_DIR } from './changes'

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
const dir = SNAPSHOT_DIR(ROOT)
mkdirSync(dir, { recursive: true })
const snap = snapshotOf(dataset, year)
writeFileSync(join(dir, `${year}.json`), `${JSON.stringify(snap, null, 1)}\n`)
console.log(`✓ data/real/snapshots/${year}.json: ${Object.keys(snap.subjects).length} subjects, ${Object.keys(snap.components).length} components`)
