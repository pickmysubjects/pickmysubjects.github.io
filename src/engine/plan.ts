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

/**
 * The first semester that hasn't started yet: before March it's this year's
 * Semester 1, before August this year's Semester 2, otherwise next year's Semester 1.
 */
export function nextSemester(today: Date): { year: number; period: Period } {
  const year = today.getFullYear()
  const month = today.getMonth() // 0 = January
  if (month < 2) return { year, period: 'semester-1' }
  if (month < 7) return { year, period: 'semester-2' }
  return { year: year + 1, period: 'semester-1' }
}

/** Whether a term has begun by this date (roughly: summer January, S1 March, winter late June, S2 late July). */
export function termStarted(term: { year: number; period: Period }, today: Date): boolean {
  const START: Record<Period, [number, number]> = { summer: [0, 1], 'semester-1': [2, 1], winter: [5, 20], 'semester-2': [6, 20] }
  const [month, day] = START[term.period]
  return today >= new Date(term.year, month, day)
}

/**
 * The semester under way on this date (teaching through exams), or null between semesters.
 * Semester 1 runs roughly March–June, semester 2 August–November.
 */
export function currentSemester(today: Date): { year: number; period: Period } | null {
  const month = today.getMonth() // 0 = January
  if (month >= 2 && month <= 5) return { year: today.getFullYear(), period: 'semester-1' }
  if (month >= 7 && month <= 10) return { year: today.getFullYear(), period: 'semester-2' }
  return null
}

/**
 * Where a plan should begin: the start of study, or, for someone who started already, the
 * semester they're in now (its subjects have no marks yet, so they aren't on the record), else
 * the next one.
 */
export function planStart(start: { year: number; period: Period }, today: Date): { year: number; period: Period } {
  const from = currentSemester(today) ?? nextSemester(today)
  const key = (t: { year: number; period: Period }) => t.year * 10 + (t.period === 'semester-2' ? 2 : 1)
  return key(start) >= key(from) ? start : from
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
