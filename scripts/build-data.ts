/**
 * Validates every curated YAML file and writes one JSON bundle per dataset to
 * src/generated/. Exits non-zero on any schema error, so bad data never reaches the app.
 */
import { latestDataYear, thisYear } from '../src/engine/dataYear'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { buildChanges, SNAPSHOT_DIR } from './changes'
import { join } from 'node:path'
import { buildDataset, ROOT } from './dataset'
import { splitDataset } from '../src/engine/split'
import { buildTakenWith } from '../src/engine/related'
import { buildHomeDemo } from './homeDemo'
import { buildKeyDates } from './keyDates'
const OUT = join(ROOT, 'src', 'generated')
mkdirSync(OUT, { recursive: true })

let failed = false
for (const name of ['real', 'demo'] as const) {
  const { dataset, errors, warnings, missing } = buildDataset(name)
  if (errors.length > 0) {
    failed = true
    console.error(`✗ data/${name}: ${errors.length} error(s)\n\n${errors.join('\n\n')}\n`)
    continue
  }
  if (warnings.length) console.warn(`! data/${name}: ${warnings.length} warning(s)\n  ${warnings.join('\n  ')}`)
  const gaps = missing.length ? ` — referenced but not curated yet: ${missing.join(', ')}` : ''
  console.log(
    `✓ data/${name}: ${Object.keys(dataset.subjects).length} subjects, ${dataset.courses.length} course(s), ${dataset.components.length} component(s)${gaps}`,
  )
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(dataset))
  if (name === 'real') {
    // What the browser loads: a lean core before the app starts, and each area's long text
    // (about, discussion summaries, breadth lists) only when one of its subjects is opened.
    // Node-side scripts and tests keep reading the full real.json above.
    // "Often taken with" for each subject page, worked out once here rather than in the browser.
    const { core, details } = splitDataset(dataset, buildTakenWith(dataset, latestDataYear(dataset.subjects)))
    writeFileSync(join(OUT, 'real-core.json'), JSON.stringify(core))
    const dir = join(OUT, 'detail')
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir)
    for (const [area, part] of Object.entries(details)) writeFileSync(join(dir, `${area}.json`), JSON.stringify(part))
    // The home page's worked examples: a real subject and a real generated plan.
    // "What changed in <year>", only once the next year is entered and differs (no empty page).
    const changes = buildChanges(dataset, SNAPSHOT_DIR(ROOT))
    if (changes) writeFileSync(join(OUT, 'changes.json'), JSON.stringify(changes))
    else rmSync(join(OUT, 'changes.json'), { force: true })
    writeFileSync(join(OUT, 'home-demo.json'), JSON.stringify(buildHomeDemo(dataset, thisYear())))
  }
}
// The University's key dates (guide page, home strip, calendar files).
const keyDates = buildKeyDates(ROOT)
if (keyDates.errors.length) {
  failed = true
  console.error(`✗ data/real/keyDates: ${keyDates.errors.length} error(s)\n\n${keyDates.errors.join('\n\n')}\n`)
} else {
  writeFileSync(join(OUT, 'key-dates.json'), JSON.stringify({ checked: keyDates.checked, dates: keyDates.dates }))
  console.log(`✓ data/real/keyDates: ${keyDates.dates.length} dates`)
}
if (failed) process.exit(1)
