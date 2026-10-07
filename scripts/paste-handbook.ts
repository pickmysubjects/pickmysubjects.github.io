/**
 * Turn text you copied from a Handbook page (in your own browser) into a
 * subject YAML draft. Nothing is fetched — the text comes from stdin.
 *
 *   pbpaste | npm run paste -- --code COMP30027 --title "Machine Learning" --level 3
 *   pbpaste | npm run paste -- --code COMP30027 --title "Machine Learning" --level 3 --write
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { parseHandbookPaste } from '../src/engine/handbookPaste'
import { subjectYaml } from '../src/engine/serialize'
import { ROOT } from './dataset'

const { values } = parseArgs({
  options: {
    code: { type: 'string' },
    title: { type: 'string' },
    level: { type: 'string' },
    points: { type: 'string', default: '12.5' },
    year: { type: 'string', default: String(new Date().getFullYear()) },
    write: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
})

if (!values.code || !values.title || !values.level) {
  console.error('Usage: pbpaste | npm run paste -- --code CODE --title "Title" --level N [--points 12.5] [--year 2026] [--write]')
  process.exit(2)
}

const text = readFileSync(0, 'utf8')
const parsed = parseHandbookPaste(text)
const yaml = subjectYaml(
  {
    code: values.code.toUpperCase(),
    title: values.title,
    level: Number(values.level),
    points: Number(values.points),
    year: Number(values.year),
  },
  parsed,
)

for (const w of parsed.warnings) console.error(`⚠ ${w}`)

if (values.write) {
  const file = join(ROOT, 'data', 'real', 'subjects', `${values.code.toUpperCase()}.yaml`)
  if (existsSync(file) && !values.force) {
    console.error(`${file} already exists — re-run with --force to overwrite.`)
    process.exit(1)
  }
  writeFileSync(file, yaml)
  console.error(`Wrote ${file}. Check it against the Handbook before committing.`)
} else {
  process.stdout.write(yaml)
}
