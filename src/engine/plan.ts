import type { Period } from './schema'

export interface PlanTerm {
  year: number
  period: Period
  subjects: string[]
}

export interface Plan {
  course: string
  /** Handbook year whose course rules apply (normally the year of commencement). */
  courseYear: number
  major?: string
  specialisation?: string
  /** Subjects already completed before the first planned term (with or without marks). */
  completed: string[]
  terms: PlanTerm[]
  /** On a student visa: each half-year normally needs 50 points. */
  international?: boolean
  /** Subjects whose prerequisites the student says they meet where we can't check (e.g. a VCE score). */
  confirmed?: string[]
}

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
  results: { year?: number; period?: Period }[] = [],
): { year: number; period: Period } {
  const dated = results.filter((r): r is { year: number; period: Period } => Number.isInteger(r.year) && r.period !== undefined && r.period in ORDER)
  if (!dated.length) return start
  const latest = dated.reduce((a, b) => (termOrder(a) >= termOrder(b) ? a : b))
  const after = semesterAfter(latest)
  return termOrder(after) > termOrder(start) ? after : start
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
