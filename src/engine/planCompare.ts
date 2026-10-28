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
  wam: PlanWam | null
}

/** A plan's predicted WAM and what it rests on. */
export interface PlanWam {
  mark: number
  /** Every planned subject at the low (high) end of its likely range at once: the plan's own range. */
  low: number
  high: number
  /**
   * Each planned subject with a predicted mark: its share of the WAM (its points over all the
   * points the WAM counts) and how uncertain its mark is (one standard deviation). For telling
   * whether two plans' WAMs are apart; left out, the plans' own ranges are used instead.
   */
  planned?: { code: string; share: number; sd: number }[]
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
 * How uncertain the gap between two plans' predicted WAMs is (one standard deviation).
 *
 * Each plan's own range moves every planned subject to its low or high end together, which is
 * right for one plan on its own: much of a prediction's error is how well we know the student,
 * and that is shared by every subject. Between two plans that shared part cancels: a subject in
 * both plans with the same share of the WAM is off by the same amount in both. What is left is
 * the subjects that differ (or weigh differently, when the plans count different points), each
 * with its own independent error, so the gap's uncertainty is the root-sum-square of those
 * subjects' errors, each weighted by the difference in its share of the two WAMs.
 */
export function wamGapSd(a: PlanWam, b: PlanWam): number {
  const of = (w: PlanWam) => new Map((w.planned ?? []).map((x) => [x.code, x]))
  const ma = of(a)
  const mb = of(b)
  let variance = 0
  for (const code of new Set([...ma.keys(), ...mb.keys()])) {
    const x = ma.get(code)
    const y = mb.get(code)
    const sd = Math.max(x?.sd ?? 0, y?.sd ?? 0)
    variance += ((x?.share ?? 0) - (y?.share ?? 0)) ** 2 * sd ** 2
  }
  return Math.sqrt(variance)
}

/**
 * Whether two or more predicted WAMs are about the same: every pair's gap is within one standard
 * deviation of that gap's uncertainty (wamGapSd), which comes only from the subjects the two
 * plans don't share. Plans without the planned subjects fall back to the widest of their own
 * ranges. Null when any plan has no prediction.
 */
export function wamAboutSame(facts: PlanFacts[]): boolean | null {
  const wams = facts.map((f) => f.wam)
  if (wams.some((w) => w === null)) return null
  const ws = wams as PlanWam[]
  if (ws.some((w) => !w.planned)) {
    const marks = ws.map((w) => w.mark)
    return Math.max(...marks) - Math.min(...marks) <= Math.max(...ws.map(halfRange))
  }
  return ws.every((a, i) => ws.every((b, j) => j <= i || Math.abs(a.mark - b.mark) <= wamGapSd(a, b)))
}

/** What the summary says, in order; each line's row is where it links. Text is the page's job. */
export type SummaryLine =
  | { kind: 'majors' }
  | { kind: 'careers'; n: number }
  | { kind: 'subjects'; differ: number; moved: number }
  | { kind: 'rules' }
  | { kind: 'finish' }
  | { kind: 'heaviest' }
  | { kind: 'wam'; aboutSame: boolean }

/** What differs between the plans beyond their facts: majors, jobs and subjects. */
export interface SummaryExtra {
  /** Each plan's major and minor, as shown. */
  majors?: string[]
  /** Each plan's jobs. */
  careers?: string[][]
  /** From the timeline. */
  subjects?: { differ: number; moved: number }
}

/** Jobs some plans lead to but not all of them. */
export function careersNotInAll(careers: string[][]): string[] {
  const all = new Set(careers.flat())
  return [...all].filter((job) => !careers.every((c) => c.includes(job)))
}

/**
 * The summary's facts: the real differences first (majors, jobs, subjects), then rule failures,
 * finish, heaviest semester and predicted WAM. A fact is left out when every plan has the same
 * value or a plan has none. Never a verdict on the whole plan.
 */
export function summaryLines(facts: PlanFacts[], extra: SummaryExtra = {}): SummaryLine[] {
  const out: SummaryLine[] = []
  if (extra.majors && !allSame(extra.majors)) out.push({ kind: 'majors' })
  const jobs = extra.careers ? careersNotInAll(extra.careers).length : 0
  if (jobs) out.push({ kind: 'careers', n: jobs })
  if (extra.subjects && (extra.subjects.differ || extra.subjects.moved)) out.push({ kind: 'subjects', ...extra.subjects })
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
  /** In this same semester in some other plans, not all. */
  | 'some'

export interface TimelineChip {
  code: string
  state: ChipState
  /** For 'moved': where another plan has it (the first plan, or the second for the first). */
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
 * Every semester any plan uses, in order, with each plan's subjects there. Semesters no plan
 * uses are left out. A subject planned twice (a retake) is matched copy by copy: copies in the
 * same semester pair up first, then the rest in order, so a second copy another plan doesn't
 * have is "only", not "moved". A copy is "moved" only when no other plan has it in this
 * semester; "from" is where the first plan has it (the second, for the first plan), else where
 * another plan does.
 */
export function alignTimeline(plans: PlanTerm[][], termPoints: (terms: PlanTerm[], i: number) => number): Timeline {
  const keyOf = (t: TermRef) => termKey(t.year, t.period)
  const where = plans.map((terms) => {
    const m = new Map<string, TermRef[]>()
    for (const t of terms) for (const c of t.subjects) m.set(c, [...(m.get(c) ?? []), { year: t.year, period: t.period }])
    return m
  })
  // For each copy of a subject in plan p, the copy it pairs with in plan q (null: q has no copy left).
  const pairs = new Map<string, (TermRef | null)[]>()
  function pair(p: number, q: number, code: string): (TermRef | null)[] {
    const id = `${p}|${q}|${code}`
    const known = pairs.get(id)
    if (known) return known
    const mine = where[p]!.get(code) ?? []
    const theirs = [...(where[q]!.get(code) ?? [])]
    const out: (TermRef | null)[] = mine.map(() => null)
    mine.forEach((t, j) => {
      const k = theirs.findIndex((x) => keyOf(x) === keyOf(t))
      if (k >= 0) out[j] = theirs.splice(k, 1)[0]!
    })
    mine.forEach((_, j) => {
      if (!out[j] && theirs.length) out[j] = theirs.shift()!
    })
    pairs.set(id, out)
    return out
  }
  const rows = new Map<number, TimelineRow>()
  plans.forEach((terms, p) => {
    const seen = new Map<string, number>()
    terms.forEach((t, i) => {
      if (t.subjects.length === 0) return
      const k = keyOf(t)
      const row = rows.get(k) ?? { year: t.year, period: t.period, cells: plans.map(() => null), same: false }
      const ref = p === 0 ? 1 : 0
      const chips = t.subjects.map((code): TimelineChip => {
        const j = seen.get(code) ?? 0
        seen.set(code, j + 1)
        const others = plans.flatMap((_, q) => (q === p ? [] : [{ q, at: pair(p, q, code)[j] ?? null }]))
        if (others.every((o) => !o.at)) return { code, state: 'only' }
        if (others.some((o) => o.at && keyOf(o.at) === k)) return { code, state: others.every((o) => o.at && keyOf(o.at) === k) ? 'same' : 'some' }
        const from = others.find((o) => o.q === ref && o.at)?.at ?? others.find((o) => o.at)!.at!
        return { code, state: 'moved', from }
      })
      row.cells[p] = { chips, points: termPoints(terms, i) }
      rows.set(k, row)
    })
  })
  for (const row of rows.values()) {
    const sets = row.cells.map((c) => (c ? [...c.chips.map((x) => x.code)].sort().join() : ''))
    row.same = sets.every((s) => s !== '' && s === sets[0])
  }
  // A subject differs when the plans don't all have it the same number of times; it moved when
  // they do but not in the same semesters.
  const all = new Set(where.flatMap((m) => [...m.keys()]))
  let differ = 0
  let moved = 0
  for (const code of all) {
    const at = where.map((m) => (m.get(code) ?? []).map(keyOf).sort((x, y) => x - y).join())
    const counts = where.map((m) => m.get(code)?.length ?? 0)
    if (!allSame(counts)) differ++
    else if (!allSame(at)) moved++
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
