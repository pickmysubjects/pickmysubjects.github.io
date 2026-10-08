/**
 * Validates every curated YAML file and writes one JSON bundle per dataset to
 * src/generated/. Exits non-zero on any schema error, so bad data never reaches the app.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDataset, ROOT } from './dataset'
const OUT = join(ROOT, 'src', 'generated')
mkdirSync(OUT, { recursive: true })

let failed = false
for (const name of ['real', 'demo'] as const) {
  const { dataset, errors, missing } = buildDataset(name)
  if (errors.length > 0) {
    failed = true
    console.error(`✗ data/${name}: ${errors.length} error(s)\n\n${errors.join('\n\n')}\n`)
    continue
  }
  const gaps = missing.length ? ` — referenced but not curated yet: ${missing.join(', ')}` : ''
  console.log(
    `✓ data/${name}: ${Object.keys(dataset.subjects).length} subjects, ${dataset.courses.length} course(s), ${dataset.components.length} component(s)${gaps}`,
  )
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(dataset))
}
if (failed) process.exit(1)
