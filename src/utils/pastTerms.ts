import { today as clock } from '@/engine/dataYear'
import { hasEnded, isFail, isUpcoming, periodsFor, termKey, type Period, type Profile, type Subject } from '@/engine'

export interface PastResult {
  code: string
  mark?: number
  failed: boolean
  /** On the record but not done yet: a graded subject with no mark (the card asks for one). */
  pending?: boolean
}

export interface PastTerm {
  year: number
  period: Period
  results: PastResult[]
}

const PERIODS: readonly Period[] = ['summer', 'semester-1', 'winter', 'semester-2']

/**
 * The student's completed subjects grouped into the semesters they were taken, oldest first,
 * plus the ones with no semester given. A stored semester that doesn't make sense (edited by
 * hand, say) counts as not given rather than breaking the board.
 */
export function pastTerms(results: Profile['results'], subjects: Record<string, Subject> = {}): { terms: PastTerm[]; undated: PastResult[] } {
  const byTerm = new Map<number, PastTerm>()
  const undated: PastResult[] = []
  for (const r of results) {
    const item: PastResult = { code: r.code, mark: r.mark, failed: isFail(r), ...(isFail(r) || isDone(r, subjects) ? {} : { pending: true }) }
    const valid = Number.isInteger(r.year) && (r.year as number) >= 1990 && (r.year as number) <= 2100 && PERIODS.includes(r.period as Period)
    if (!valid) {
      undated.push(item)
      continue
    }
    const key = termKey(r.year as number, r.period as Period)
    let term = byTerm.get(key)
    if (!term) byTerm.set(key, (term = { year: r.year as number, period: r.period as Period, results: [] }))
    term.results.push(item)
  }
  const terms = [...byTerm.entries()].sort(([a], [b]) => a - b).map(([, t]) => t)
  return { terms, undated }
}

/** Every term from one semester to another, in order (summer and winter included). */
export function termsBetween(from: { year: number; period: Period }, to: { year: number; period: Period }): { year: number; period: Period }[] {
  const order = (t: { year: number; period: Period }) => t.year * 10 + PERIODS.indexOf(t.period)
  const out: { year: number; period: Period }[] = []
  for (let y = from.year; y <= to.year; y++) {
    for (const p of PERIODS) {
      const t = { year: y, period: p }
      if (order(t) >= order(from) && order(t) <= order(to)) out.push(t)
    }
  }
  return out
}

// A term that has started is past for planning (the dates live with the engine's plan rules).
export { isUpcoming }

/**
 * The term to suggest for adding a subject: the first one it runs in that is still ahead, from
 * the plan's first semester on if that's later; a past term only when nothing else is left.
 */
export function defaultTerm<T extends { year: number; period: Period }>(choices: readonly T[], planStart?: { year: number; period: Period }, today: Date = clock()): T | undefined {
  const ahead = choices.filter((x) => isUpcoming(x, today))
  const fromPlan = planStart ? ahead.find((x) => termKey(x.year, x.period) >= termKey(planStart.year, planStart.period)) : undefined
  return fromPlan ?? ahead[0] ?? choices.at(-1)
}

/**
 * The semesters a subject on the record can be dated to: from six years back (or the earliest
 * known term, if earlier) to the plan's last term, at least three years from the start. A student
 * who started before the plan's start (or the default setup's) can still pick their real semester.
 */
export function recordTermChoices(known: readonly { year: number; period: Period }[], now: Date = clock()): { year: number; period: Period }[] {
  const order = (x: { year: number; period: Period }) => x.year * 10 + PERIODS.indexOf(x.period)
  const back = { year: now.getFullYear() - 6, period: 'semester-1' as Period }
  const start = known.length ? known.reduce((a, b) => (order(b) < order(a) ? b : a)) : back
  const first = order(back) < order(start) ? back : start
  const last = known.length ? known.reduce((a, b) => (order(b) > order(a) ? b : a)) : back
  // At least three years from the start of study, so a fresh setup still has semesters to pick.
  const floor = { year: start.year + 2, period: 'semester-2' as Period }
  return termsBetween(first, order(last) > order(floor) ? last : floor)
}

export interface AddTermChoice {
  year: number
  period: Period
  /** Whether the Handbook timetable has the subject running then; false is a warning, not a block. */
  offered: boolean
}

/**
 * Where "Add to my plan" can put a subject: every semester from the start of study to the plan's
 * last term (at least three years on, and into next year), past ones included so a student can
 * record what they took. Terms the subject doesn't run in stay, flagged. Summer and winter show
 * only when the subject runs then or the plan already has that term, so the list stays short.
 */
export function addTermChoices(
  subject: Subject,
  start: { year: number; period: Period },
  planTerms: readonly { year: number; period: Period }[],
  now: Date = clock(),
): AddTermChoice[] {
  const key = (x: { year: number; period: Period }) => termKey(x.year, x.period)
  const floor = { year: start.year + 2, period: 'semester-2' as Period }
  const soon = { year: now.getFullYear() + 1, period: 'semester-2' as Period }
  const end = [...planTerms, soon].reduce((a, b) => (key(b) > key(a) ? b : a), floor)
  const inPlan = new Set(planTerms.map(key))
  return termsBetween(start, end)
    .map((x) => ({ ...x, offered: periodsFor(subject, x.year).includes(x.period) }))
    .filter((x) => x.offered || x.period === 'semester-1' || x.period === 'semester-2' || inPlan.has(key(x)))
}

/** The suggested term: the first offered one still ahead (see defaultTerm), else any term ahead. */
export function defaultAddTerm<T extends AddTermChoice>(choices: readonly T[], planStart?: { year: number; period: Period }, today: Date = clock()): T | undefined {
  return defaultTerm(choices.filter((x) => x.offered), planStart, today) ?? defaultTerm(choices, planStart, today)
}

/** Where a term stands today: over, under way, or still ahead (Melbourne dates). */
export type TermState = 'ended' | 'now' | 'ahead'
export function termState(term: { year: number; period: Period }, now: Date = clock()): TermState {
  if (isUpcoming(term, now)) return 'ahead'
  return hasEnded(term, now) ? 'ended' : 'now'
}

/** A typed mark: full-width digits (from a Chinese or Japanese keyboard) count; 0–100, or none. */
export function parseMark(raw: string | undefined): number | undefined {
  const s = (raw ?? '').normalize('NFKC').trim()
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : undefined
}

/**
 * Marks entered for one semester, put on the record: each subject's entry for that semester (or
 * an earlier one with no fail) is replaced, so nothing is listed twice; earlier fails stay, as both
 * attempts are on the transcript.
 */
export function recordMarks(
  results: Profile['results'],
  term: { year: number; period: Period },
  list: readonly { code: string; mark?: number }[],
): Profile['results'] {
  const codes = new Set(list.map((x) => x.code))
  const kept = results.filter((r) => !codes.has(r.code) || (isFail(r) && !(r.year === term.year && r.period === term.period)))
  return [...kept, ...list.map((x) => ({ code: x.code, year: term.year, period: term.period, ...(x.mark === undefined ? {} : { mark: x.mark }) }))]
}

/**
 * What the done toggle may record: a pass/fail subject is done with no mark; a graded one only
 * with a mark of 0–100 (else null: it stays planned and the box asks for one).
 */
export function doneWith(typed: string | undefined, passFail?: boolean): { mark?: number } | null {
  if (passFail) return {}
  const mark = parseMark(typed)
  return mark === undefined ? null : { mark }
}

/**
 * Done, as everything that reads the record counts it: passed, and a graded subject only with a
 * mark. A graded entry with no mark is on the record but not done: no WAM, not a prerequisite met.
 */
export function isDone(r: { code: string; mark?: number; failed?: boolean }, subjects: Record<string, Subject>): boolean {
  return !isFail(r) && (r.mark !== undefined || subjects[r.code]?.passFail === true)
}

/**
 * One-time clean-up of a build (a02e1c08) that copied every subject of a begun semester onto My
 * record, without marks. Those entries carry no flag, so the rule is: a graded entry with no mark
 * (and not a fail), dated to a semester the plan has, goes back to that semester as planned.
 * Entries with a mark, pass/fail ones, fails, undated ones and ones outside the plan's semesters
 * stay as they are (a student who added one by hand on My record keeps it there).
 */
export function unstaleRecord<T extends { year: number; period: Period; subjects: string[] }>(
  results: Profile['results'],
  terms: readonly T[],
  subjects: Record<string, Subject>,
): { results: Profile['results']; terms: T[] } | null {
  const next = terms.map((x) => ({ ...x, subjects: [...x.subjects] }))
  const kept: Profile['results'] = []
  for (const r of results) {
    const home = next.find((x) => x.year === r.year && x.period === r.period)
    if (!home || r.mark !== undefined || isFail(r) || subjects[r.code]?.passFail) {
      kept.push(r)
      continue
    }
    if (!next.some((x) => x.subjects.includes(r.code))) home.subjects.push(r.code)
  }
  return kept.length === results.length ? null : { results: kept, terms: next }
}
