import type { PlanTerm } from './plan'
import type { Dataset, Subject } from './schema'

/**
 * Year-long subjects (the Handbook's "Year Long"): one enrolment that runs through Semester 1
 * and Semester 2 of the same year. A plan lists one in its Semester 1 term only, so its points
 * count once; for the study load each semester carries half of them. Its prerequisites must be
 * met before Semester 1, and it is finished only after Semester 2.
 */

type Subjects = Pick<Dataset, 'subjects'>
type Term = Pick<PlanTerm, 'year' | 'period' | 'subjects'>

export function isYearLong(s: Subject | undefined): boolean {
  return s?.yearLong === true
}

/** Points a subject puts on one semester it runs in: half each for a year-long one. */
export function termShare(s: Subject | undefined): number {
  const points = s?.points ?? 12.5
  return isYearLong(s) ? points / 2 : points
}

/** Year-long subjects started in this year's Semester 1 that are still running in this term (its winter or Semester 2). */
export function unfinishedIn(terms: readonly Term[], index: number, data: Subjects): string[] {
  const t = terms[index]
  if (!t || (t.period !== 'winter' && t.period !== 'semester-2')) return []
  return terms
    .filter((o) => o.year === t.year && o.period === 'semester-1')
    .flatMap((o) => o.subjects)
    .filter((c) => isYearLong(data.subjects[c]))
}

/** Year-long subjects whose second half is studied in this term (a Semester 2). */
export function carriedInto(terms: readonly Term[], index: number, data: Subjects): string[] {
  return terms[index]?.period === 'semester-2' ? unfinishedIn(terms, index, data) : []
}

/** Points studied in a term: its own subjects (year-long ones at half) and the second half of year-long ones carried in. */
export function termLoad(terms: readonly Term[], index: number, data: Subjects): number {
  const t = terms[index]
  if (!t) return 0
  return [...t.subjects, ...carriedInto(terms, index, data)].reduce((sum, c) => sum + termShare(data.subjects[c]), 0)
}

/** Subjects finished before a term starts: what came earlier, less year-long subjects still running. */
export function doneBefore(completed: Iterable<string>, terms: readonly Term[], index: number, data: Subjects): Set<string> {
  const running = new Set(unfinishedIn(terms, index, data))
  return new Set([...completed, ...terms.slice(0, index).flatMap((t) => t.subjects)].filter((c) => !running.has(c)))
}

/** Each term's subjects for judging its load, with year-long subjects carried into Semester 2. */
export function termsWithCarried(terms: readonly Term[], data: Subjects): string[][] {
  return terms.map((t, i) => [...t.subjects, ...carriedInto(terms, i, data)])
}

/** Index of the Semester 2 term that finishes a year-long subject started in this Semester 1 term, or -1. */
export function secondHalfOf(terms: readonly Term[], index: number): number {
  const t = terms[index]
  if (!t || t.period !== 'semester-1') return -1
  return terms.findIndex((o) => o.year === t.year && o.period === 'semester-2')
}

/**
 * Points on the record per semester ("2027|semester-1"), passed or failed. A year-long result
 * puts half on the semester it is recorded in and half on the other semester of that year.
 */
export function recordedLoads(results: readonly { code: string; year?: number; period?: string }[], data: Subjects): Record<string, number> {
  const out: Record<string, number> = {}
  const add = (key: string, n: number) => (out[key] = (out[key] ?? 0) + n)
  for (const r of results) {
    if (r.year === undefined || r.period === undefined) continue
    const s = data.subjects[r.code]
    add(`${r.year}|${r.period}`, termShare(s))
    if (isYearLong(s) && (r.period === 'semester-1' || r.period === 'semester-2')) add(`${r.year}|${r.period === 'semester-1' ? 'semester-2' : 'semester-1'}`, termShare(s))
  }
  return out
}

/**
 * Whether a subject fits a term's study load (not yet planned anywhere): its share there, and for
 * a year-long subject a Semester 2 in the plan with room for its second half.
 */
export function fitsLoad(terms: readonly Term[], index: number, code: string, data: Subjects, load: number): boolean {
  const s = data.subjects[code]
  if (termLoad(terms, index, data) + termShare(s) > load) return false
  if (!isYearLong(s)) return true
  const second = secondHalfOf(terms, index)
  return second >= 0 && termLoad(terms, second, data) + termShare(s) <= load
}
