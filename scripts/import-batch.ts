/**
 * Import a batch of Handbook pages you copied by hand (nothing is fetched). Each page in the
 * file starts with a "===== CODE Title" line; "#" lines are notes.
 *
 *   npm run import-batch -- ../subject-compass-inbox/batch17-subjects.txt --year 2027             (dry run)
 *   npm run import-batch -- ../subject-compass-inbox/batch17-subjects.txt --year 2027 --write
 *
 * Everything already in the subject file stays unless the page says otherwise (title and level
 * are kept; points come from the page header when it has one), and its teaching periods for
 * other years are kept too. --year is required.
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
  options: { write: { type: 'boolean', default: false }, year: { type: 'string' } },
})

// The Handbook year must be said: a default would write 2027 pages as 2026's (or the other way).
if (!values.year || !/^20\d\d$/.test(values.year)) {
  console.error('Say which Handbook year the pages are from: --year 2027')
  process.exit(1)
}

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

    const fresh = parse(subjectYaml({ code, title, level, points, year: Number(values.year) }, parsed)) as Record<string, unknown>
    // Start from the file as it is, then lay the page's facts over it: everything the page doesn't
    // carry (year-long, discontinued, campus, attendance, texts, signals, a hand-entered contact
    // hours…) stays instead of being dropped.
    const doc: Record<string, unknown> = { ...old, ...fresh }
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
    // One "(From …, re-check:)" mark at most: the older one is replaced, not stacked year on year.
    const bareNote = handNote.replace(/^\(From \d{4}, re-check:\)\s*/, '')
    doc.notes = `Source: ${values.year} University of Melbourne Handbook; facts summarised and checked.${bareNote ? ` ${oldYear && oldYear !== values.year ? `(From ${oldYear}, re-check:) ` : ''}${bareNote}` : ''}`
    writeFileSync(path, stringify(doc, { lineWidth: 0 }))
    written++
  }
}
console.log(`written ${written}`)
