/**
 * Import a batch of Handbook pages you copied by hand (nothing is fetched). Each page in the
 * file starts with a "===== CODE Title" line; "#" lines are notes.
 *
 *   npm run import-batch -- ../subject-compass-inbox/batch17-subjects.txt            (dry run)
 *   npm run import-batch -- ../subject-compass-inbox/batch17-subjects.txt --write
 *
 * Title, level, points, categories and hand tags already in the subject file are kept, and so
 * are its teaching periods when the paste has none.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { parse, stringify } from 'yaml'
import { parseHandbookPaste } from '../src/engine/handbookPaste'
import { subjectYaml } from '../src/engine/serialize'
import { ROOT } from './dataset'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { write: { type: 'boolean', default: false }, year: { type: 'string', default: '2026' } },
})

const KEEP = ['categories', 'skills', 'topics', 'breadth_offerings'] as const
const REQUISITES = ['prerequisites', 'corequisites', 'non_allowed'] as const
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
let written = 0

for (const file of positionals) {
  // "===== CODE Title" starts each page.
  for (const chunk of readFileSync(file, 'utf8').split(/^(?======)/m)) {
    const [head = '', ...lines] = chunk.split(/\r?\n/)
    const code = /^=====\s*([A-Z]{4}\d{5})\b/.exec(head)?.[1]
    if (!code) continue
    const body = lines.filter((l) => !l.startsWith('#')).join('\n')
    const parsed = parseHandbookPaste(body)
    const path = join(ROOT, 'data', 'real', 'subjects', `${code}.yaml`)
    const old = existsSync(path) ? (parse(readFileSync(path, 'utf8')) as Record<string, unknown>) : {}
    // The separator may carry only the code; the page itself has "Title (CODE)".
    const onPage = new RegExp(`^\\s*(.+?) \\(${code}\\)\\s*$`, 'm').exec(body)?.[1]?.trim()
    // Notes in brackets on the header line ("(被引用 3 次)") are ours, not part of the title.
    const title = (old.title as string | undefined) || head.replace(/^=====\s*/, '').replace(code, '').replace(/\([^)]*\)/g, '').trim() || onPage || ''
    const level = (old.level as number | undefined) ?? Number(code[4])
    // The page's own header says "Points: 25" for a double-weight subject; 12.5 only when it's missing.
    const onPagePoints = Number(/Points:\s*(\d+(?:\.\d+)?)/.exec(body)?.[1]) || undefined
    const points = onPagePoints ?? (old.points as number | undefined) ?? 12.5

    const problems = [...parsed.warnings]
    if (parsed.prerequisites === 'unknown') problems.push('PREREQUISITES UNKNOWN')
    if (parsed.assessment === 'unknown') problems.push('NO ASSESSMENT')
    else {
      const sum = parsed.assessment.reduce((a, t) => a + t.weight, 0)
      if (Math.abs(sum - 100) > 0.5) problems.push(`ASSESSMENT SUMS TO ${sum}`)
    }
    console.log(`${problems.length ? 'WARN' : 'OK  '} ${code} ${problems.join('; ')}`)
    // Nothing usable (a discontinued subject, or only the Overview tab was copied): leave the file alone.
    const empty = parsed.prerequisites === 'unknown' && parsed.assessment === 'unknown'
    if (!values.write || empty || problems.some((p) => p.startsWith('ASSESSMENT SUMS'))) continue

    const doc = parse(subjectYaml({ code, title, level, points, year: Number(values.year) }, parsed)) as Record<string, unknown>
    // A new year adds to the years already there: plans and past results still need when it ran before.
    const oldOfferings = old.offerings && old.offerings !== 'unknown' ? (old.offerings as Record<string, unknown>) : {}
    if (doc.offerings === 'unknown') doc.offerings = old.offerings ?? 'unknown'
    else doc.offerings = { ...oldOfferings, ...(doc.offerings as Record<string, unknown>) }
    for (const k of KEEP) if (old[k] !== undefined) doc[k] = old[k]
    // A paste without its "Breadth options" part keeps the list we already had.
    if (doc.breadth_for === undefined && old.breadth_for !== undefined) doc.breadth_for = old.breadth_for
    if (doc.recommended === undefined && old.recommended !== undefined) doc.recommended = old.recommended
    // Our own notes (a Handbook mistake we corrected, an intensive's dates) carry over, marked to
    // re-check. Where a subject has one and the new Handbook's requisites differ from ours, ours stay
    // and the new wording is printed for a person to decide; otherwise the new facts win, printed too.
    const handNote = String(old.notes ?? '').replace(/^Source: \d{4} University of Melbourne Handbook; facts summarised and checked\.\s*/, '').trim()
    for (const k of REQUISITES) {
      if (old[k] === undefined || same(old[k], doc[k])) continue
      if (handNote) {
        console.log(`     KEPT ${k} (hand note): ${values.year} Handbook says ${JSON.stringify(doc[k])}`)
        doc[k] = old[k]
      } else console.log(`     CHANGED ${k}: ${JSON.stringify(old[k])} -> ${JSON.stringify(doc[k])}`)
    }
    if (old.assessment !== undefined && !same(old.assessment, doc.assessment)) console.log('     CHANGED assessment')
    const oldYear = String(old.source_year ?? '')
    doc.notes = `Source: ${values.year} University of Melbourne Handbook; facts summarised and checked.${handNote ? ` ${oldYear && oldYear !== values.year ? `(From ${oldYear}, re-check:) ` : ''}${handNote}` : ''}`
    writeFileSync(path, stringify(doc, { lineWidth: 0 }))
    written++
  }
}
console.log(`written ${written}`)
