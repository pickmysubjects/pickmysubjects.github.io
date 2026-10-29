import type { Period } from './schema'
import type { Credit } from './credit'
import { melbourneDay, today } from './dataYear'

export interface PlanTerm {
  year: number
  period: Period
  subjects: string[]
  /** A semester that has begun, changed by the student: a rebuild leaves it as it is. */
  edited?: boolean
}

export interface Plan {
  course: string
  /** Handbook year whose course rules apply (normally the year of commencement). */
  courseYear: number
  major?: string
  /** An optional second major (component id), for courses that allow two. */
  major2?: string
  specialisation?: string
  /** Minor ids (component ids). Undefined: not known, so conditions naming a minor stay unknown. */
  minors?: string[]
  /** A concurrent diploma taken alongside (its code, e.g. D-COMP), and its stream (a component id). */
  diploma?: string
  diplomaStream?: string
  /** Subjects already completed before the first planned term (with or without marks). */
  completed: string[]
  /** Credit for study elsewhere with no named subject: counts in the course rules, done before the plan. */
  credit?: Credit[]
  terms: PlanTerm[]
  /** On a student visa: each half-year normally needs 50 points. */
  international?: boolean
  /** Points a semester the student chose to study (part-time: 25 or 37.5); missing: the course's standard load. */
  load?: number
  /**
   * Points already on the record per semester ("2027|semester-2"), passed or failed: enrolled
   * either way, so they count towards that semester's load.
   */
  recordedLoad?: Record<string, number>
  /** Marks (0–100) of completed subjects, for average and WAM conditions. */
  marks?: Record<string, number>
  /** The WAM over the whole marked record (fails included), for WAM conditions. */
  wam?: number | null
  /** Subjects whose prerequisites the student says they meet where we can't check (e.g. a VCE score). */
  confirmed?: string[]
}

/** Points a semester a student can choose to study: part-time (25, 37.5) or full-time (50). */
export const STUDY_LOADS = [25, 37.5, 50] as const

export type Severity = 'error' | 'warning' | 'info'

/** Values interpolated into a localised message. */
export type Params = Record<string, string | number>

/**
 * A message the UI can localise: `key` selects the translation, `params` fills it,
 * and `text` is the English rendering (used by tests, logs and as a fallback).
 */
export interface Note {
  key: string
  params: Params
  text: string
}

export interface Issue {
  severity: Severity
  /** Stable machine-readable kind, e.g. "prereq-unmet"; also the translation key. */
  kind: string
  /** English text; the UI localises from `kind` + `params`. */
  message: string
  params: Params
  subject?: string
  termIndex?: number
  ruleId?: string
}

/** Standard two-semesters-a-year term sequence starting at a given term. */
export function standardTerms(startYear: number, startPeriod: Period, count: number): PlanTerm[] {
  const terms: PlanTerm[] = []
  let year = startYear
  let period: Period = startPeriod === 'semester-2' ? 'semester-2' : 'semester-1'
  for (let i = 0; i < count; i++) {
    terms.push({ year, period, subjects: [] })
    if (period === 'semester-1') period = 'semester-2'
    else {
      period = 'semester-1'
      year++
    }
  }
  return terms
}

const ORDER: Record<Period, number> = { summer: 0, 'semester-1': 1, winter: 2, 'semester-2': 3 }
const termOrder = (t: { year: number; period: Period }) => t.year * 10 + ORDER[t.period]

/** The semester after a term: a summer or winter term leads into the semester that follows it. */
function semesterAfter(t: { year: number; period: Period }): { year: number; period: Period } {
  if (t.period === 'summer') return { year: t.year, period: 'semester-1' }
  if (t.period === 'semester-2') return { year: t.year + 1, period: 'semester-1' }
  return { year: t.year, period: 'semester-2' }
}

/**
 * Where a plan begins: the start of study, or the semester after the latest one on the record
 * if that's later. Only what the student told us counts; today's date doesn't come into it.
 */
export function planStart(
  start: { year: number; period: Period },
  results: { code?: string; year?: number; period?: Period }[] = [],
  /** With points and a load: a semester not yet full is carried on in, not skipped. */
  fill?: { pointsOf: (code: string) => number; load: number },
): { year: number; period: Period } {
  const dated = results.filter((r): r is { code?: string; year: number; period: Period } => Number.isInteger(r.year) && r.period !== undefined && r.period in ORDER)
  if (!dated.length) return start
  const latest = dated.reduce((a, b) => (termOrder(a) >= termOrder(b) ? a : b))
  if (fill && (latest.period === 'semester-1' || latest.period === 'semester-2')) {
    const there = dated.filter((r) => r.year === latest.year && r.period === latest.period).reduce((sum, r) => sum + fill.pointsOf(r.code ?? ''), 0)
    if (there < fill.load) return termOrder(latest) > termOrder(start) ? { year: latest.year, period: latest.period } : start
  }
  const after = semesterAfter(latest)
  return termOrder(after) > termOrder(start) ? after : start
}

/** Roughly when each teaching period starts and ends (month 0–11, day). */
const STARTS: Record<Period, [number, number]> = { summer: [0, 1], 'semester-1': [1, 24], winter: [5, 30], 'semester-2': [6, 21] }
const ENDS: Record<Period, [number, number]> = { summer: [1, 15], 'semester-1': [5, 25], winter: [6, 18], 'semester-2': [10, 25] }

/** A term's day as YYYY-MM-DD, to compare with melbourneDay(). */
const dayOf = (year: number, [m, d]: [number, number]) => `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Whether a term is still ahead of `now` in Melbourne (it hasn't started there yet). */
export function isUpcoming(term: { year: number; period: Period }, now: Date = today()): boolean {
  return dayOf(term.year, STARTS[term.period]) > melbourneDay(now)
}

/** Whether a term is over by `now` in Melbourne (its last day has begun there: exams are done). */
export function hasEnded(term: { year: number; period: Period }, now: Date = today()): boolean {
  return dayOf(term.year, ENDS[term.period]) <= melbourneDay(now)
}

/** The first semester (1 or 2) that hasn't started yet in Melbourne. */
export function firstUpcomingSemester(now: Date = today()): { year: number; period: Period } {
  const y = Number(melbourneDay(now).slice(0, 4))
  const choices: { year: number; period: Period }[] = [
    { year: y, period: 'semester-1' },
    { year: y, period: 'semester-2' },
    { year: y + 1, period: 'semester-1' },
  ]
  return choices.find((t) => isUpcoming(t, now)) ?? choices[2]!
}

/**
 * Where new subjects can go: `start`, or the first semester still ahead if `start` has already
 * begun. A plan never puts new subjects into a semester that is under way or over.
 */
export function upcomingStart(start: { year: number; period: Period }, now: Date = today()): { year: number; period: Period } {
  if (isUpcoming(start, now)) return start
  const next = firstUpcomingSemester(now)
  return termOrder(next) > termOrder(start) ? next : start
}

export function termLabel(term: Pick<PlanTerm, 'year' | 'period'>): string {
  const names: Record<Period, string> = {
    summer: 'Summer',
    'semester-1': 'Sem 1',
    winter: 'Winter',
    'semester-2': 'Sem 2',
  }
  return `${term.year} ${names[term.period]}`
}

/** Whether a new student can start the course in this period (every period, unless the course says). */
export function canEnterIn(course: { entryPeriods?: readonly Period[] } | undefined, period: Period): boolean {
  return !course?.entryPeriods || course.entryPeriods.includes(period)
}

/** The first term from `start` on that a new student can begin the course in. */
export function nextEntry(course: { entryPeriods?: readonly Period[] } | undefined, start: { year: number; period: Period }): { year: number; period: Period } {
  const periods = Object.keys(ORDER) as Period[]
  let t = start
  for (let i = 0; i < 4 && !canEnterIn(course, t.period); i++) {
    const next = (ORDER[t.period] + 1) % 4
    t = { year: next === 0 ? t.year + 1 : t.year, period: periods.find((p) => ORDER[p] === next) as Period }
  }
  return t
}
