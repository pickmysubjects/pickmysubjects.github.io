import type { Period } from './schema'

/**
 * The periods a subject is taught in: a year-long subject is enrolled once (Semester 1) but runs
 * through Semester 2 as well, so lists and filters show and find it in both.
 */
export function withYearLong(subject: { yearLong?: boolean }, periods: Period[]): Period[] {
  return subject.yearLong && periods.includes('semester-1') && !periods.includes('semester-2') ? [...periods, 'semester-2'] : periods
}
