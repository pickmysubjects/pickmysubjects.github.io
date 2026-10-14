/**
 * Accuracy check against real transcripts that students shared on purpose, kept outside the repo
 * (default ../subject-compass-eval/students, see its README). Nothing personal lives here.
 *
 *   npx tsx scripts/eval-transcripts.ts [folder]
 *
 * For each student and each semester after their first, it replays what they had done before and
 * asks: (1) do the top-10 suggestions include what they actually took next (precision/recall@10),
 * with only skills and interests, then with marks too; (2) how close is the likely mark to the real
 * one (mean absolute error), next to just predicting their WAM so far.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDataset, ROOT } from './dataset'
import { predictMark } from '../src/engine/predict'
import { recommend, type Profile } from '../src/engine/recommend'
import type { Period, Skill } from '../src/engine/schema'

const dir = process.argv[2] ?? join(ROOT, '..', 'subject-compass-eval', 'students')
if (!existsSync(dir)) {
  console.log(`No transcripts folder at ${dir}.`)
  process.exit(0)
}
const { dataset: data } = buildDataset('real')
const PERIOD: Record<string, Period> = { SU: 'summer', S1: 'semester-1', WI: 'winter', S2: 'semester-2' }
const ORDER: Period[] = ['summer', 'semester-1', 'winter', 'semester-2']

interface Row {
  year: number
  period: Period
  code: string
  mark?: number
}

function read(file: string) {
  const meta: Record<string, string> = {}
  const rows: Row[] = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^#\s*(\w+):\s*(.*)$/.exec(line)
    if (m) meta[m[1]!] = m[2]!.trim()
    const r = /^(\d{4})\s+(SU|S1|WI|S2)\s+([A-Z]{4}\d{5})(?:\s+(\d{1,3}))?/.exec(line.trim())
    if (r) rows.push({ year: Number(r[1]), period: PERIOD[r[2]!]!, code: r[3]!, mark: r[4] ? Number(r[4]) : undefined })
  }
  const skills: Partial<Record<Skill, number>> = {}
  for (const part of (meta.skills ?? '').split(',')) {
    const [k, v] = part.trim().split(/\s+/)
    if (k && v) skills[k as Skill] = Number(v)
  }
  const interests = (meta.interests ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return { course: meta.course || 'B-SCI', major: meta.major || '', skills, interests, rows }
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
const fmt = (x: number) => (Number.isNaN(x) ? '–' : x.toFixed(2))
/** ± one standard error: with few students or semesters, differences inside it are luck. */
const se = (xs: number[]) => {
  const v = xs.filter((x) => !Number.isNaN(x))
  if (v.length < 2) return NaN
  const m = avg(v)
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1) / v.length)
}
const pm = (xs: number[]) => `${fmt(avg(xs))}±${fmt(se(xs))}`
const all = { pCold: [] as number[], rCold: [] as number[], pMarks: [] as number[], rMarks: [] as number[], mae: [] as number[], maeWam: [] as number[] }

for (const file of readdirSync(dir).filter((f) => f.endsWith('.txt')).sort()) {
  const st = read(join(dir, file))
  const terms = [...new Set(st.rows.map((r) => `${r.year}|${r.period}`))].sort((a, b) => {
    const [ya, pa] = a.split('|')
    const [yb, pb] = b.split('|')
    return Number(ya) - Number(yb) || ORDER.indexOf(pa as Period) - ORDER.indexOf(pb as Period)
  })
  const per = { pCold: [] as number[], rCold: [] as number[], pMarks: [] as number[], rMarks: [] as number[], err: [] as number[], errWam: [] as number[] }
  terms.forEach((key, i) => {
    if (i === 0) return
    const [y, p] = key.split('|')
    const year = Number(y)
    const period = p as Period
    const before = st.rows.filter((r) => terms.indexOf(`${r.year}|${r.period}`) < i)
    const target = st.rows.filter((r) => `${r.year}|${r.period}` === key && data.subjects[r.code])
    if (!target.length) return
    const points = before.reduce((sum, r) => sum + (data.subjects[r.code]?.points ?? 12.5), 0)
    const opts = {
      course: st.course,
      year,
      term: { year, period },
      maxLevel: Math.min(3, Math.floor(points / 100) + 1),
      eligibleWith: before.map((r) => r.code),
      planned: before.map((r) => r.code),
      programme: st.major ? { courseYear: 2026, components: [st.major] } : undefined,
      limit: 10,
    }
    const base: Profile = { results: [], skills: st.skills, interests: st.interests, goal: 'balanced' }
    // A card names its either-or versions too (COMP20003 or COMP20007), so those count as shown.
    const hits = (recs: { code: string; alternatives?: string[] }[]) => recs.filter((r) => target.some((x) => x.code === r.code || r.alternatives?.includes(x.code))).length
    const cold = recommend(data, base, opts)
    const marked = recommend(data, { ...base, results: before.map((r) => ({ code: r.code, mark: r.mark })) }, opts)
    per.pCold.push(hits(cold) / 10)
    per.rCold.push(hits(cold) / target.length)
    per.pMarks.push(hits(marked) / 10)
    per.rMarks.push(hits(marked) / target.length)

    // Likely mark from earlier marks only, next to the WAM so far.
    const marks = new Map(before.filter((r) => r.mark !== undefined).map((r) => [r.code, r.mark!]))
    const wam = avg([...marks.values()])
    for (const t of target) {
      if (t.mark === undefined || marks.size < 3) continue
      const guess = predictMark(data.subjects[t.code]!, marks, data)
      if (!guess) continue
      per.err.push(Math.abs(guess.mark - t.mark))
      per.errWam.push(Math.abs(wam - t.mark))
    }
  })
  console.log(
    `${file.padEnd(10)} ${st.course} ${(st.major || '-').padEnd(32)} recall@10 cold ${pm(per.rCold)} with marks ${pm(per.rMarks)} (${per.rCold.length} semesters) | precision ${fmt(avg(per.pCold))}/${fmt(avg(per.pMarks))} | mark MAE ${pm(per.err)} vs WAM ${pm(per.errWam)} (n=${per.err.length})`,
  )
  all.pCold.push(avg(per.pCold))
  all.rCold.push(avg(per.rCold))
  all.pMarks.push(avg(per.pMarks))
  all.rMarks.push(avg(per.rMarks))
  if (per.err.length) {
    all.mae.push(avg(per.err))
    all.maeWam.push(avg(per.errWam))
  }
}
console.log(
  `\nAll ${all.rCold.length} students: recall@10 cold ${pm(all.rCold)}, with marks ${pm(all.rMarks)}; precision@10 ${fmt(avg(all.pCold))}/${fmt(avg(all.pMarks))}; mark MAE ${pm(all.mae)} vs WAM ${pm(all.maeWam)}` +
    (all.rCold.length < 5 ? '\nFewer than 5 students: treat these as a direction, not a measure.' : ''),
)
