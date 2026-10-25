/**
 * Data audit: reads every subject in data/real and prints grouped findings with counts and codes.
 * It never changes anything. Run with `npm run audit` (or `npx tsx scripts/audit-data.ts`);
 * `--all` prints every code instead of the first 40 per finding.
 *
 * Checks are general rules over the files; nothing here names a particular subject.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { ROOT } from './dataset'

const BASE = join(ROOT, 'data', 'real')
const SHOW_ALL = process.argv.includes('--all')
const CODE = /^[A-Z]{4}\d{5}$/

type Raw = Record<string, any>

function yamlFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) return yamlFiles(full)
      return /\.ya?ml$/.test(name) ? [full] : []
    })
}
const read = (file: string): Raw => parse(readFileSync(file, 'utf8')) ?? {}

// ---------- load ----------
const subjects = new Map<string, Raw>()
for (const f of yamlFiles(join(BASE, 'subjects'))) {
  const s = read(f)
  subjects.set(s.code, s)
}
// The newest Handbook year in the data (as engine/dataYear's latestDataYear): checks are about it, and
// during the yearly update "no <year> key" lists the subjects still to enter.
const YEAR = String(Math.max(...[...subjects.values()].flatMap((s) => (s.offerings && s.offerings !== 'unknown' ? Object.keys(s.offerings).map(Number) : []))))
const abouts = new Map<string, Raw>()
for (const f of yamlFiles(join(BASE, 'about'))) {
  const a = read(f)
  abouts.set(a.code, a)
}
const titles: Record<string, Raw> = read(join(BASE, 'subject-titles.yaml'))
const discussions = yamlFiles(join(BASE, 'discussions')).map((f) => ({ file: f.slice(BASE.length + 1), d: read(f) }))

// ---------- findings ----------
interface Finding {
  check: string
  label: string
  items: string[]
}
const findings = new Map<string, Finding>()
function add(check: string, label: string, item: string): void {
  const key = `${check}\u0000${label}`
  let f = findings.get(key)
  if (!f) findings.set(key, (f = { check, label, items: [] }))
  f.items.push(item)
}

// Walk a requirement expression; `visit` gets every leaf object or bare code.
function walkReq(e: unknown, visit: (leaf: any) => void): void {
  if (e === null || e === undefined || e === 'none' || e === 'unknown') return
  if (Array.isArray(e)) return e.forEach((x) => walkReq(x, visit))
  if (typeof e === 'string') return visit(e)
  if (typeof e !== 'object') return
  const o = e as Raw
  if (o.all) return walkReq(o.all, visit)
  if (o.any) return walkReq(o.any, visit)
  visit(o)
}

// Codes a component or course requires with no alternative: reached only through `all` / plain lists.
function requiredCodes(node: unknown, out: Set<string>, required = true): void {
  if (typeof node === 'string') {
    if (required && CODE.test(node)) out.add(node)
    return
  }
  if (Array.isArray(node)) return node.forEach((x) => requiredCodes(x, out, required))
  if (!node || typeof node !== 'object') return
  for (const [k, v] of Object.entries(node as Raw)) {
    if (k === 'all' || k === 'requirements' || k === 'core') requiredCodes(v, out, required)
    else requiredCodes(v, out, false)
  }
}
const requiredBy = new Map<string, string[]>()
for (const dir of ['components', 'courses', 'diplomas']) {
  for (const f of yamlFiles(join(BASE, dir))) {
    const doc = read(f)
    const set = new Set<string>()
    requiredCodes(doc.requirements, set)
    if (doc.core) requiredCodes(doc.core, set)
    for (const c of set) requiredBy.set(c, [...(requiredBy.get(c) ?? []), String(doc.id ?? doc.code ?? f)])
  }
}
// A component (or the course itself) requiring a subject its course closes to its students: no
// plan can finish it without an error. A component only earlier starters may finish says so.
const closedBy = new Map<string, Set<string>>()
for (const f of yamlFiles(join(BASE, 'courses'))) {
  const doc = read(f)
  if (doc.code && Array.isArray(doc.closed)) closedBy.set(String(doc.code), new Set(doc.closed.map(String)))
}
for (const dir of ['components', 'courses']) {
  for (const f of yamlFiles(join(BASE, dir))) {
    const doc = read(f)
    const course = String(doc.course ?? doc.code ?? '')
    const closed = closedBy.get(course)
    if (!closed?.size) continue
    const set = new Set<string>()
    requiredCodes(doc.requirements, set)
    if (doc.core) requiredCodes(doc.core, set)
    for (const r of Array.isArray(doc.rules) ? doc.rules : []) if (r?.kind === 'compulsory') requiredCodes({ all: r.subjects }, set)
    const hit = [...set].filter((c) => closed.has(c))
    if (hit.length) add('requirements', 'component requires a subject its course closes', `${doc.id ?? doc.code} (${course}): ${hit.join(', ')}${doc.closed_from ? ` — closed to starters from ${doc.closed_from}` : ''}`)
  }
}
// Subject prerequisites that need a code with no alternative.
for (const [code, s] of subjects) {
  for (const field of ['prerequisites', 'corequisites']) {
    const set = new Set<string>()
    const top = s[field]
    if (typeof top === 'string' && CODE.test(top)) set.add(top)
    else if (top && typeof top === 'object' && !Array.isArray(top)) {
      if (top.subject) set.add(top.subject)
      if (top.all) requiredCodes({ all: top.all }, set)
    }
    for (const c of set) requiredBy.set(c, [...(requiredBy.get(c) ?? []), `${code} ${field}`])
  }
}

const PLAUSIBLE_POINTS = new Set([3.125, 6.25, 12.5, 18.75, 25, 37.5, 50, 62.5, 75, 100])
const has = (text: string, re: RegExp) => re.test(text)
const learnText = new Map<string, string[]>()
// A title with its part / level marker dropped ("Choir 2", "Cultural Studies B", "Spanish 3 (Intensive)").
const normTitle = (t: string) =>
  t.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/( ([0-9]+|[a-d]|i{1,3}|iv|part [a-z0-9]+))+$/, '')
// Variants of one subject: the same title once markers are dropped, or one title inside the other
// ("Choir 1" and "Conservatorium Choir 1").
const sameSeries = (titles: string[]) => titles.every((a) => titles.every((b) => a === b || a.includes(b) || b.includes(a)))

for (const [code, s] of subjects) {
  const notes: string = s.notes ?? ''
  const offered: string[] | undefined = s.offerings && s.offerings !== 'unknown' ? s.offerings[YEAR] : undefined
  const closed = s.discontinued_from !== undefined && s.discontinued_from <= Number(YEAR)

  // 1. Assessment weights
  const tasks: Raw[] | undefined = s.assessment
  if (!tasks) {
    if (s.pass_fail) add('assessment', 'no assessment table (pass/fail, accepted)', code)
    else if (/assessment is (listed|given|set out) under/i.test(notes)) add('assessment', 'no assessment table (explained in notes, accepted)', code)
    else add('assessment', 'no assessment table', code)
  }
  else {
    const sum = tasks.filter((t) => !t.hurdle || t.weight > 0).reduce((a, t) => a + (t.weight ?? 0), 0)
    if (Math.abs(sum - 100) > 0.01) add('assessment', `weights sum to ≠100`, `${code} (${sum})`)
  }

  // 2. Contact hours
  const h = s.weekly_contact_hours
  if (h === undefined) add('contact-hours', 'missing weekly_contact_hours', code)
  else if (h < 0.5) add('contact-hours', '< 0.5 h/week', `${code} (${h})`)
  else if (h > 12) add('contact-hours', '> 12 h/week (semester total?)', `${code} (${h})`)
  else if (h >= 24 && h % 12 === 0) add('contact-hours', 'looks like a semester total', `${code} (${h})`)

  // 3. Offerings
  if (closed) add('offerings', `discontinued (from ${YEAR} or earlier) — info`, code)
  else if (s.offerings === 'unknown' || s.offerings === undefined) add('offerings', 'offerings unknown', code)
  else if (offered === undefined) add('offerings', `no ${YEAR} key`, code)
  else if (offered.length === 0) {
    const by = requiredBy.get(code)
    if (by) add('offerings', `"${YEAR}": [] but required with no alternative (report only)`, `${code} ← ${[...new Set(by)].slice(0, 3).join(', ')}`)
    else add('offerings', `"${YEAR}": [] (not offered) — info`, code)
  }

  // 4. Requirements
  for (const field of ['prerequisites', 'corequisites']) {
    walkReq(s[field], (leaf) => {
      const c = typeof leaf === 'string' ? leaf : leaf.subject
      if (c && !subjects.has(c)) add('requirements', `${field} code not in data`, `${code} → ${c}`)
      if (leaf && typeof leaf === 'object') {
        for (const c2 of leaf.points?.from ?? []) if (!subjects.has(c2)) add('requirements', `${field} points.from code not in data`, `${code} → ${c2}`)
        if (leaf.manual) add('requirements', `free-text manual ${field}`, `${code}: ${String(leaf.manual).slice(0, 90)}`)
      }
    })
    if (s[field] === 'unknown' || s[field] === undefined) add('requirements', `${field} unknown`, code)
  }
  // A subject that must be done first at a higher level than this one is usually a misread
  // "one of the following" list (an `all` that should be an `any`).
  {
    const set = new Set<string>()
    const top = s.prerequisites
    if (typeof top === 'string' && CODE.test(top)) set.add(top)
    else if (top && typeof top === 'object' && !Array.isArray(top)) {
      if (top.subject) set.add(top.subject)
      if (top.all) requiredCodes({ all: top.all }, set)
    }
    for (const c of set) if (Number(c[4]) > Number(code[4]) && Number(code[4]) < 4) add('requirements', 'required prerequisite at a higher level (all that should be any?)', `${code} → ${c}`)
  }
  if (Array.isArray(s.non_allowed)) for (const c of s.non_allowed) if (!subjects.has(c)) add('requirements', 'non_allowed code not in data', `${code} → ${c}`)
  if (s.non_allowed === 'unknown' || s.non_allowed === undefined) add('requirements', 'non_allowed unknown', code)

  // 5. Completeness
  if (!abouts.has(code)) add('completeness', 'no about file', code)
  if (!titles[code]?.zh) add('completeness', 'no zh title', code)
  if (!titles[code]?.['zh-TW']) add('completeness', 'no zh-TW title', code)
  if (!s.skills?.length) add('completeness', 'empty skills', code)
  if (!s.topics?.length) add('completeness', 'empty topics', code)
  if (!s.handbook) add('completeness', 'no handbook link', code)
  if (!s.verified_on) add('completeness', 'no verified_on', code)

  // 6. Notes vs fields
  if (has(notes, /pass\s*\/\s*fail|\bpass-fail\b|\bpass or fail\b/i) && !s.pass_fail && !has(notes, /not (marked |graded )?pass\s*\/\s*fail/i))
    add('notes-vs-fields', 'notes mention pass/fail, no pass_fail', code)
  if (has(notes, /year[- ]long/i) && !s.year_long) add('notes-vs-fields', 'notes mention year long, no year_long', code)
  if (has(notes, /\d+\s*%[^.;]{0,60}(attend|classes|tutorials|seminars|workshops|studios|practicals)|attend[^.;]{0,40}\d+\s*%/i) && s.min_attendance === undefined)
    add('notes-vs-fields', 'notes mention attendance %, no min_attendance', code)
  if (has(notes, new RegExp(`not offered( in)? ${YEAR}|not offered in ${YEAR}`, 'i')) && offered && offered.length > 0)
    add('notes-vs-fields', `notes say not offered in ${YEAR}, offerings non-empty`, code)

  // 7. Attendance vs hurdle row
  // House convention: an attendance hurdle lives in min_attendance alone (the Handbook lists it as
  // an N/A hurdle line, so it gets no assessment row). A weighted participation task that is also
  // a hurdle is usually "attend X% and take part", so it should come with min_attendance.
  const attendRow = tasks?.some((t) => t.kind === 'participation' && t.hurdle)
  if (s.min_attendance !== undefined && !attendRow) add('attendance', 'min_attendance with no participation hurdle row (house convention, accepted)', code)
  if (s.min_attendance === undefined && attendRow) add('attendance', 'participation hurdle row without min_attendance', code)

  // 8. Level / points
  const digit = Number(code[4])
  if (s.level !== digit) add('level-points', 'level ≠ 5th code digit', `${code} (level ${s.level})`)
  if (!PLAUSIBLE_POINTS.has(s.points)) add('level-points', 'implausible points', `${code} (${s.points})`)

  // 9. About text duplicates
  const a = abouts.get(code)
  const en = a?.learn?.en
  if (en) learnText.set(en, [...(learnText.get(en) ?? []), code])
  if (a && a.code !== code) add('about', 'about file code mismatch', code)
}
for (const code of abouts.keys()) if (!subjects.has(code)) add('about', 'about file for unknown subject', code)
for (const codes of learnText.values()) {
  if (codes.length < 2) continue
  if (!sameSeries([...new Set(codes.map((c) => normTitle(subjects.get(c)!.title)))])) add('about', 'same about text across different titles', codes.join(' = '))
  else add('about', 'same about text, same-title variants (accepted)', codes.join(' = '))
}
for (const code of Object.keys(titles)) if (!subjects.has(code)) add('completeness', 'title entry for unknown subject', code)

// 10. Discussions
for (const { file, d } of discussions) {
  if (!subjects.has(d.code)) add('discussions', 'refers to unknown subject', `${file} (${d.code})`)
  const n = d.source === 'Reddit' ? d.threads : d.reviews
  if (!(n >= 3)) add('discussions', `fewer than 3 ${d.source === 'Reddit' ? 'threads' : 'reviews'}`, `${file} (${n})`)
  if (!file.endsWith(`${d.code}.yaml`)) add('discussions', 'file name ≠ code', file)
}

// ---------- print ----------
const ORDER = ['assessment', 'contact-hours', 'offerings', 'requirements', 'completeness', 'notes-vs-fields', 'attendance', 'level-points', 'about', 'discussions']
console.log(`Audited ${subjects.size} subjects, ${abouts.size} about files, ${discussions.length} discussion files.\n`)
let total = 0
for (const check of ORDER) {
  const list = [...findings.values()].filter((f) => f.check === check)
  console.log(`== ${check} ${list.length ? '' : '— clean'}`)
  for (const f of list) {
    total += f.items.length
    const shown = SHOW_ALL ? f.items : f.items.slice(0, 40)
    console.log(`  [${f.items.length}] ${f.label}`)
    for (const i of shown) console.log(`      ${i}`)
    if (shown.length < f.items.length) console.log(`      … ${f.items.length - shown.length} more (--all)`)
  }
}
console.log(`\n${total} findings.`)
