import { termKey } from './availability'
import type { PlanTerm } from './plan'
import type { Period } from './schema'
import type { StressLevel } from './termStress'

/**
 * Comparing a student's plans (2 to 5) fact by fact and semester by semester. Pure: the facts of
 * each plan come in already worked out (rules, load, prediction), so the page and the tests read
 * the same rules for "equal", "better" and what the summary says.
 */

export interface TermRef {
  year: number
  period: Period
}

/** One plan's facts, each worked out by the engine on its own degree. */
export interface PlanFacts {
  /** Points done (record and credit) plus points planned. */
  points: number
  /** The degree's total points. */
  required: number
  /** Points still not in the plan (0 when the plan has enough). */
  short: number
  rules: { total: number; failed: number; unknown: number }
  /** The last semester with subjects in it. */
  finish: TermRef | null
  /** The heaviest planned semester: its points and how heavy it is for this student. */
  heaviest: (TermRef & { points: number; level: StressLevel }) | null
  /** Semesters marked heavy or very heavy. */
  heavy: number
  /** Subject problems (a prerequisite not met, not offered then, can't be combined…). */
  problems: number
  /** Where the first problem is, for the link to fix it. */
  problemTerm: TermRef | null
  /** Planned subjects with a final exam, of those whose assessment is known. */
  exams: { withExam: number; known: number }
  /** Planned subjects with a hurdle. */
  hurdles: number
  /** Predicted WAM at the end (record marks plus each planned subject's predicted mark), or null with no marks. */
  wam: { mark: number; low: number; high: number } | null
}

/** Rows whose "better" is objective, and which way: fewer is better for all of them. */
export type MarkedRow = 'rules' | 'short' | 'heavy' | 'problems'

const VALUE_OF: Record<MarkedRow, (f: PlanFacts) => number> = {
  rules: (f) => f.rules.failed,
  short: (f) => f.short,
  heavy: (f) => f.heavy,
  problems: (f) => f.problems,
}

/**
 * The plans that are better on an objective row (the fewest failed rules, missing points, heavy
 * semesters, subject problems): their indexes, or none when every plan is the same.
 */
export function betterOn(row: MarkedRow, facts: PlanFacts[]): number[] {
  const values = facts.map(VALUE_OF[row])
  const best = Math.min(...values)
  if (values.every((v) => v === best)) return []
  return values.flatMap((v, i) => (v === best ? [i] : []))
}

/** Whether every plan shows the same thing (by a key that says what's shown). */
export function allSame<T>(values: T[], key: (v: T) => string = (v) => JSON.stringify(v)): boolean {
  return values.every((v) => key(v) === key(values[0] as T))
}

/** Half the predicted WAM's likely range. */
const halfRange = (w: { low: number; high: number }) => (w.high - w.low) / 2

/**
 * Whether two or more predicted WAMs are about the same: the gap between the highest and the
 * lowest is inside the widest likely range. Null when any plan has no prediction.
 */
export function wamAboutSame(facts: PlanFacts[]): boolean | null {
  const wams = facts.map((f) => f.wam)
  if (wams.some((w) => w === null)) return null
  const marks = (wams as NonNullable<PlanFacts['wam']>[]).map((w) => w.mark)
  const widest = Math.max(...(wams as NonNullable<PlanFacts['wam']>[]).map(halfRange))
  return Math.max(...marks) - Math.min(...marks) <= widest
}

/** What the summary says, in order; each line's row is where it links. Text is the page's job. */
export type SummaryLine =
  | { kind: 'rules' }
  | { kind: 'finish' }
  | { kind: 'heaviest' }
  | { kind: 'wam'; aboutSame: boolean }

/**
 * The summary's facts: rule failures, finish, heaviest semester, predicted WAM. A fact is left out
 * when every plan has the same value or a plan has none. Never a verdict on the whole plan.
 */
export function summaryLines(facts: PlanFacts[]): SummaryLine[] {
  const out: SummaryLine[] = []
  if (!allSame(facts.map((f) => f.rules.failed))) out.push({ kind: 'rules' })
  if (facts.every((f) => f.finish) && !allSame(facts.map((f) => termKey(f.finish!.year, f.finish!.period)))) out.push({ kind: 'finish' })
  if (facts.every((f) => f.heaviest) && !allSame(facts.map((f) => `${f.heaviest!.points}|${f.heaviest!.level}`))) out.push({ kind: 'heaviest' })
  const same = wamAboutSame(facts)
  if (same !== null && !allSame(facts.map((f) => Math.round(f.wam!.mark)))) out.push({ kind: 'wam', aboutSame: same })
  return out
}

// ---------- The semester-by-semester timeline ----------

/** How a subject in one plan's semester stands next to the other plans. */
export type ChipState =
  /** In every plan, in this same semester. */
  | 'same'
  /** In no other plan. */
  | 'only'
  /** In another plan too, but in a different semester there. */
  | 'moved'
  /** In some other plans (same semester), not all. */
  | 'some'

export interface TimelineChip {
  code: string
  state: ChipState
  /** For 'moved': where it is in the plan it's compared with. */
  from?: TermRef
}

export interface TimelineCell {
  chips: TimelineChip[]
  points: number
}

export interface TimelineRow extends TermRef {
  /** One per plan, in the plans' order; null when that plan has nothing in this semester. */
  cells: (TimelineCell | null)[]
  /** Every plan has the same subjects here. */
  same: boolean
}

export interface Timeline {
  rows: TimelineRow[]
  /** Subjects that aren't in every plan. */
  differ: number
  /** Subjects in every plan, but not in the same semester in all of them. */
  moved: number
}

/**
 * Every semester any plan uses, in order, with each plan's subjects there. A plan is compared
 * with the first plan; the first plan with the second. Semesters no plan uses are left out.
 */
export function alignTimeline(plans: PlanTerm[][], termPoints: (terms: PlanTerm[], i: number) => number): Timeline {
  const where = plans.map((terms) => {
    const m = new Map<string, TermRef>()
    for (const t of terms) for (const c of t.subjects) if (!m.has(c)) m.set(c, { year: t.year, period: t.period })
    return m
  })
  const keyOf = (t: TermRef) => termKey(t.year, t.period)
  const rows = new Map<number, TimelineRow>()
  plans.forEach((terms, p) => {
    terms.forEach((t, i) => {
      if (t.subjects.length === 0) return
      const k = keyOf(t)
      const row = rows.get(k) ?? { year: t.year, period: t.period, cells: plans.map(() => null), same: false }
      const ref = p === 0 ? 1 : 0
      const chips = t.subjects.map((code): TimelineChip => {
        const others = where.filter((_, q) => q !== p).map((m) => m.get(code))
        if (others.every((o) => !o)) return { code, state: 'only' }
        const there = where[ref]?.get(code) ?? others.find((o) => o)!
        if (keyOf(there) !== k) return { code, state: 'moved', from: there }
        return { code, state: others.every((o) => o && keyOf(o) === k) ? 'same' : 'some' }
      })
      row.cells[p] = { chips, points: termPoints(terms, i) }
      rows.set(k, row)
    })
  })
  for (const row of rows.values()) {
    const sets = row.cells.map((c) => (c ? [...c.chips.map((x) => x.code)].sort().join() : ''))
    row.same = sets.every((s) => s !== '' && s === sets[0])
  }
  const all = new Set(where.flatMap((m) => [...m.keys()]))
  let differ = 0
  let moved = 0
  for (const code of all) {
    const at = where.map((m) => m.get(code))
    if (at.some((x) => !x)) differ++
    else if (!allSame(at.map((x) => keyOf(x!)))) moved++
  }
  return { rows: [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r), differ, moved }
}

// ---------- The compare page's address ----------

export interface CompareAddress {
  /** Plan letters (A, B…) in column order. */
  plans: string[]
  /** "Only differences": on unless the address says diff=0. */
  diff: boolean
}

/** Reads ?plans=A,B&diff=0, keeping only letters that are real plans, each once. */
export function readCompareAddress(query: URLSearchParams, letters: string[]): CompareAddress {
  const asked = (query.get('plans') ?? '').split(',').map((x) => x.trim().toUpperCase()).filter((x) => letters.includes(x))
  return { plans: [...new Set(asked)], diff: query.get('diff') !== '0' }
}

/** The query string for a compare state (no leading ?), '' for the defaults. */
export function compareQuery(state: CompareAddress): string {
  const q = new URLSearchParams()
  if (state.plans.length) q.set('plans', state.plans.join(','))
  if (!state.diff) q.set('diff', '0')
  return q.toString().replace(/%2C/g, ',')
}
