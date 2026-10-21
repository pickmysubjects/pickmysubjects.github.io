import type { Period, Subject } from './schema'
import { PERIODS } from './schema'
import type { Tri } from './expr'

export interface AvailabilityResult {
  status: Tri
  /** Set when the answer was carried over from another year's data. */
  assumedFromYear?: number
}

/**
 * Is the subject offered in (can it be started in) this period of this year? When the requested year
 * isn't curated, falls back to the closest earlier year (or, failing that, the
 * closest later one) and reports it as an assumption rather than a fact.
 */
export function offeredIn(subject: Subject, year: number, period: Period): AvailabilityResult {
  // No longer run: never offered again, whatever earlier years' timetables said.
  if (subject.discontinuedFrom !== undefined && year >= subject.discontinuedFrom) return { status: 'fail' }
  // A year-long subject is enrolled in once, in Semester 1, and runs on through Semester 2.
  if (subject.yearLong && period !== 'semester-1') return { status: 'fail' }
  if (subject.offerings === 'unknown') return { status: 'unknown' }
  const exact = subject.offerings[String(year)]
  if (exact) return { status: exact.includes(period) ? 'ok' : 'fail' }

  const years = Object.keys(subject.offerings).map(Number)
  if (years.length === 0) return { status: 'unknown' }
  const earlier = years.filter((y) => y < year)
  const fallback = earlier.length > 0 ? Math.max(...earlier) : Math.min(...years)
  const periods = subject.offerings[String(fallback)] ?? []
  // "Not available in 2026" says nothing about 2027 (often a pause, or a new subject still to
  // start): unknown, not "never". A subject that stops for good has discontinued_from instead.
  if (periods.length === 0) return { status: 'unknown', assumedFromYear: fallback }
  return { status: periods.includes(period) ? 'ok' : 'fail', assumedFromYear: fallback }
}

/** Periods the subject is (believed to be) offered in for a year, in calendar order. */
export function periodsFor(subject: Subject, year: number): Period[] {
  return PERIODS.filter((p) => offeredIn(subject, year, p).status === 'ok')
}

/** Calendar ordering key for a term, so terms can be sorted and compared. */
export function termKey(year: number, period: Period): number {
  return year * 10 + PERIODS.indexOf(period)
}
