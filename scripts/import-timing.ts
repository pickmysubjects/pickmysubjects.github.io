/**
 * Add each assessment task's timing ("Week 6", "During the examination period") from Handbook
 * pages you copied by hand (nothing is fetched). Same paste files as import-batch: each page
 * starts with a "===== CODE" line.
 *
 *   npx tsx scripts/import-timing.ts ../subject-compass-inbox/2027-*.txt --year 2027 --report out.txt          (dry run)
 *   npx tsx scripts/import-timing.ts ../subject-compass-inbox/2027-*.txt --year 2027 --report out.txt --write
 *
 * Only pages from that Handbook year, for subject files whose data is from that year too, are used.
 * The page's tasks are matched to ours by order and weight; when the count or any weight differs,
 * the subject is skipped and listed, never guessed. Timing text we don't recognise leaves that
 * task's words as they are (kind 'other', only quoted on the site) and is listed too. Later pages of the same subject win over earlier ones.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { parseDocument } from 'yaml'
import { assessmentTimingTexts, parseHandbookPaste } from '../src/engine/handbookPaste'
import { normaliseTiming, type Timing } from '../src/engine/timing'
import { ROOT } from './dataset'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { write: { type: 'boolean', default: false }, year: { type: 'string' }, report: { type: 'string' } },
})
if (!values.year || !/^20\d\d$/.test(values.year)) {
  console.error('Say which Handbook year the pages are from: --year 2027')
  process.exit(1)
}
const year = Number(values.year)

// Last page per code wins (a later batch re-copied it).
const pages = new Map<string, string>()
for (const file of positionals) {
  for (const chunk of readFileSync(file, 'utf8').split(/^(?======)/m)) {
    const [head = '', ...lines] = chunk.split(/\r?\n/)
    const code = /^=====\s*([A-Z]{4}\d{5})\b/.exec(head)?.[1]
    if (code) pages.set(code, lines.filter((l) => !l.startsWith('#')).join('\n'))
  }
}

type Task = { kind: string; weight: number; timing?: Timing }
const skipped: string[] = []
const unknownText = new Map<string, string[]>()
const coverage = { all: 0, part: 0, none: 0 }
let written = 0

for (const [code, body] of [...pages].sort(([a], [b]) => a.localeCompare(b))) {
  const path = join(ROOT, 'data', 'real', 'subjects', `${code}.yaml`)
  if (!existsSync(path)) {
    skipped.push(`${code}: no subject file`)
    continue
  }
  const pageYear = Number(/viewing the (\d{4}) Handbook/i.exec(body)?.[1] ?? /handbook\.unimelb\.edu\.au\/(\d{4})\//.exec(body)?.[1] ?? NaN)
  if (pageYear !== year) {
    skipped.push(pageYear ? `${code}: page is from ${pageYear}, not ${year}` : `${code}: no page text (marked not in the ${year} Handbook, or the copy has no year)`)
    continue
  }
  // Edited as a YAML document, so hand comments in the file stay.
  const yamlDoc = parseDocument(readFileSync(path, 'utf8'))
  const doc = yamlDoc.toJS() as Record<string, unknown>
  if (Number(doc.source_year) !== year) {
    skipped.push(`${code}: our data is from ${String(doc.source_year)}, the page from ${year}`)
    continue
  }
  const ours = doc.assessment as Task[] | undefined
  if (!Array.isArray(ours)) {
    skipped.push(`${code}: we have no assessment`)
    continue
  }
  const parsed = parseHandbookPaste(body).assessment
  if (parsed === 'unknown') {
    skipped.push(`${code}: page's assessment table couldn't be read`)
    continue
  }
  const texts = assessmentTimingTexts(body)
  if (texts.length !== parsed.length) {
    skipped.push(`${code}: timing cells (${texts.length}) don't line up with tasks (${parsed.length})`)
    continue
  }
  const w = (ts: { weight: number }[]) => ts.map((t) => t.weight).join('/')
  if (parsed.length !== ours.length || w(parsed) !== w(ours)) {
    skipped.push(`${code}: page weights ${w(parsed)} vs ours ${w(ours)}`)
    continue
  }
  let timed = 0
  ours.forEach((_, i) => {
    const text = texts[i]
    const timing = text ? normaliseTiming(text) : undefined
    if (timing) {
      yamlDoc.setIn(['assessment', i, 'timing'], yamlDoc.createNode(timing))
      timed++
    } else {
      // Text we can't read for sure is kept as the Handbook wrote it (only quoted on the site).
      if (text) yamlDoc.setIn(['assessment', i, 'timing'], yamlDoc.createNode({ kind: 'other', text: text.replace(/\s+/g, ' ').trim() }))
      else yamlDoc.deleteIn(['assessment', i, 'timing'])
      const key = text || '(no timing cell)'
      unknownText.set(key, [...(unknownText.get(key) ?? []), code])
    }
  })
  coverage[timed === ours.length ? 'all' : timed ? 'part' : 'none']++
  if (values.write) {
    writeFileSync(path, yamlDoc.toString({ lineWidth: 0 }))
    written++
  }
}

const lines = [
  `Handbook ${year} timing import — ${pages.size} pages`,
  `Subjects matched: ${coverage.all + coverage.part + coverage.none} (all tasks timed ${coverage.all}, partly ${coverage.part}, none ${coverage.none})`,
  `Skipped: ${skipped.length}`,
  '',
  '== Skipped (not guessed) ==',
  ...skipped,
  '',
  '== Timing text not recognised (left unset) ==',
  ...[...unknownText].sort((a, b) => b[1].length - a[1].length).map(([t, codes]) => `${codes.length}\t${t}\t${codes.join(' ')}`),
]
if (values.report) writeFileSync(values.report, lines.join('\n') + '\n')
console.log(lines.slice(0, 3).join('\n'))
console.log(values.write ? `written ${written}` : 'dry run (add --write)')
