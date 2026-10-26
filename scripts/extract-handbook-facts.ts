/**
 * One-off: read the Handbook pages copied by hand (../subject-compass-inbox/done-*.txt, each
 * page starting "===== CODE …") and fill four facts into data/real/subjects/<CODE>.yaml where
 * the text says them plainly: min_attendance (only where missing), prescribed_texts, exam_book,
 * languages. Existing values are never overwritten; disagreements are listed.
 *
 *   npx tsx scripts/extract-handbook-facts.ts [inbox dir]            (dry run, report only)
 *   npx tsx scripts/extract-handbook-facts.ts [inbox dir] --write
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { parse } from 'yaml'
import { extractHandbookFacts, type HandbookFacts } from '../src/engine/handbookFacts'
import { ROOT } from './dataset'

const { values, positionals } = parseArgs({ allowPositionals: true, options: { write: { type: 'boolean', default: false } } })
const inbox = positionals[0] ?? join(ROOT, '..', 'subject-compass-inbox')

// Later files win when a page was copied twice (file names start with the date).
const pages = new Map<string, string>()
for (const f of readdirSync(inbox).filter((f) => /^done-.*\.txt$/.test(f)).sort()) {
  for (const chunk of readFileSync(join(inbox, f), 'utf8').split(/^(?======)/m)) {
    const [head = '', ...lines] = chunk.split(/\r?\n/)
    const code = /^=====\s*([A-Z]{4}\d{5})\b/.exec(head)?.[1]
    if (code) pages.set(code, lines.filter((l) => !l.startsWith('#')).join('\n'))
  }
}

const KEYS = { minAttendance: 'min_attendance', prescribedTexts: 'prescribed_texts', examBook: 'exam_book', languages: 'languages' } as const
type Key = keyof typeof KEYS
const counts: Record<Key, number> = { minAttendance: 0, prescribedTexts: 0, examBook: 0, languages: 0 }
const samples: Record<Key, string[]> = { minAttendance: [], prescribedTexts: [], examBook: [], languages: [] }
const conflicts: string[] = []
let files = 0
let appliesToExisting = 0
let neutral = 0
let appliesCount = 0
const byClass: Record<string, number> = {}
const appliesSamples: string[] = []

const yamlValue = (v: unknown) => (Array.isArray(v) ? `\n${v.map((x) => `  - ${x}`).join('\n')}` : ` ${v}`)

for (const [code, text] of [...pages].sort()) {
  const path = join(ROOT, 'data', 'real', 'subjects', `${code}.yaml`)
  if (!existsSync(path)) continue
  const src = readFileSync(path, 'utf8')
  const old = parse(src) as Record<string, unknown>
  const facts: HandbookFacts = extractHandbookFacts(text)
  const add: string[] = []
  for (const k of Object.keys(KEYS) as Key[]) {
    const v = facts[k]
    if (v === undefined) continue
    const have = old[KEYS[k]]
    if (have !== undefined) {
      if (JSON.stringify(have) !== JSON.stringify(v)) conflicts.push(`${code} ${KEYS[k]}: file ${JSON.stringify(have)}, Handbook ${JSON.stringify(v)} — "${facts.evidence[k]}"`)
      continue
    }
    counts[k]++
    samples[k].push(`${code} ${JSON.stringify(v)} — "${facts.evidence[k]}"`)
    add.push(`${KEYS[k]}:${yamlValue(v)}`)
  }
  // What the attendance share applies to, when the file's share (old or just added) is the Handbook's.
  const share = old.min_attendance ?? facts.minAttendance
  if (facts.attendanceAppliesTo && share === facts.minAttendance && old.attendance_applies_to === undefined) {
    const at = add.findIndex((l) => l.startsWith('min_attendance:'))
    const line = `attendance_applies_to:${yamlValue(facts.attendanceAppliesTo)}`
    if (at >= 0) add.splice(at + 1, 0, line)
    else add.unshift(line)
    appliesCount++
    if (old.min_attendance !== undefined) appliesToExisting++
    for (const c of facts.attendanceAppliesTo) byClass[c] = (byClass[c] ?? 0) + 1
    appliesSamples.push(`${code} ${share}% ${JSON.stringify(facts.attendanceAppliesTo)} — "${facts.evidence.minAttendance}"`)
  } else if (share !== undefined && share === facts.minAttendance) neutral++
  if (!add.length) continue
  files++
  if (!values.write) continue
  // Insert as text (some files don't round-trip through the YAML printer): before handbook/source_year.
  const at = /^(?:handbook|source_year):/m.exec(src)
  const out = at ? src.slice(0, at.index) + add.join('\n') + '\n' + src.slice(at.index) : src.replace(/\n?$/, '\n') + add.join('\n') + '\n'
  writeFileSync(path, out)
}

console.log(`pages ${pages.size}, files changed ${files}${values.write ? '' : ' (dry run)'}`)
for (const k of Object.keys(KEYS) as Key[]) {
  console.log(`\n## ${KEYS[k]}: ${counts[k]} added`)
  // An even spread of examples across the alphabet.
  const s = samples[k]
  for (let i = 0; i < Math.min(10, s.length); i++) console.log('  ' + s[Math.floor((i * s.length) / Math.min(10, s.length))])
}
console.log(`\n## attendance_applies_to: ${appliesCount} (on ${appliesToExisting} existing min_attendance), no class named: ${neutral}`)
console.log('  by class: ' + JSON.stringify(byClass))
for (let i = 0; i < Math.min(10, appliesSamples.length); i++) console.log('  ' + appliesSamples[Math.floor((i * appliesSamples.length) / 10)])
console.log(`\n## conflicts: ${conflicts.length}`)
for (const c of conflicts) console.log('  ' + c)
