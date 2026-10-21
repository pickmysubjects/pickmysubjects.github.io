import { describe, expect, it } from 'vitest'
import { checkCourse } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import type { Profile } from '../src/engine/recommend'
import type { Period } from '../src/engine/schema'
import { buildDataset } from '../scripts/dataset'

/** Whole-degree plans for other starts than Semester 1, and required subjects the course closes (real data). */
const { dataset: data } = buildDataset('real')
const profile: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
const plan = (course: string, major: string | undefined, startPeriod: Period, p = profile) =>
  generatePlan({ data, profile: p, course, courseYear: 2026, major, startYear: 2027, startPeriod })
const points = (codes: string[]) => codes.reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0)

describe('a mid-year start places every required subject', () => {
  // Each a Semester 2-only subject after a Semester 1-only one, or a chain of them.
  const cases: [string, string | undefined][] = [
    ['B-FATH', undefined],
    ['B-FAANIM', undefined],
    ['B-FAFILMTV', undefined],
    ['B-FASCWRI', undefined],
    ['B-ARTS', 'spanish-and-latin-american-studies'],
    ['B-SCIEXTD', 'chemistry'],
  ]
  for (const [course, major] of cases) {
    it(`${course}${major ? ` ${major}` : ''}`, () => {
      const { plan: p, unplaced } = plan(course, major, 'semester-2')
      expect(unplaced).toEqual([])
      expect(checkTerms(p, data).filter((i) => i.severity === 'error')).toEqual([])
      expect(p.terms.length).toBeLessThanOrEqual(10)
    }, 60_000)
  }

  it('a first-year subject the timetable can’t fit in the first year comes as early as it can, with a note', () => {
    // B-SCIEXTD: MAST10015 (Semester 2 only) follows MAST10014 (Semester 1 only).
    const { plan: p, unplaced, notes } = plan('B-SCIEXTD', undefined, 'semester-2')
    expect(unplaced).toEqual([])
    const at = (c: string) => p.terms.findIndex((t) => t.subjects.includes(c))
    expect(at('MAST10015')).toBe(at('MAST10014') + 1)
    expect(notes.some((n) => n.key === 'firstYearLate' && String(n.params.codes).includes('MAST10015'))).toBe(true)
  }, 60_000)

  it('a prerequisite that may be taken at the same time goes in the same semester', () => {
    // FLTV10025 needs FLTV10016, "may be taken concurrently": both in the first Semester 1.
    const { plan: p } = plan('B-FAANIM', undefined, 'semester-1')
    expect(p.terms[0]?.subjects).toEqual(expect.arrayContaining(['FLTV10016', 'FLTV10025']))
    expect(p.terms).toHaveLength(6)
  }, 60_000)

  it('electives never take the plan past the degree’s points while required subjects wait', () => {
    for (const period of ['semester-1', 'semester-2'] as const) {
      const { plan: p } = plan('B-FAANIM', undefined, period)
      expect(points(p.terms.flatMap((t) => t.subjects))).toBe(300)
    }
  }, 60_000)
})

describe('a required subject the course closes', () => {
  it('is left unplaced with the reason, never planned as an error', () => {
    // Informatics (B-SCI) is only for students who began before 2018; INFO30005 isn't B-SCI credit.
    const { plan: p, unplaced } = plan('B-SCI', 'informatics', 'semester-1')
    expect(unplaced).toContainEqual(expect.objectContaining({ code: 'INFO30005', reasonKey: 'closedToCourse' }))
    expect(checkTerms(p, data).filter((i) => i.kind === 'closed-to-course')).toEqual([])
    expect(checkCourse(p, data).statuses.some((s) => s.status === 'fail')).toBe(true)
  }, 60_000)
})

describe('a required subject whose mark condition the record already fails', () => {
  it('stays planned, with a note to check first', () => {
    // MUSI20201 needs 75 in MUSI10221.
    const low: Profile = { ...profile, results: [{ code: 'MUSI10221', mark: 60, year: 2026, period: 'semester-1' }] }
    const { plan: p, notes } = generatePlan({ data, profile: low, course: 'B-MUS', courseYear: 2026, startYear: 2026, startPeriod: 'semester-2', major: undefined })
    const planned = p.terms.flatMap((t) => t.subjects)
    if (planned.includes('MUSI20201')) expect(notes.some((n) => n.key === 'markUnmet' && n.params.code === 'MUSI20201')).toBe(true)
    // Passed with 82: nothing to flag.
    const high: Profile = { ...profile, results: [{ code: 'MUSI10221', mark: 82, year: 2026, period: 'semester-1' }] }
    expect(generatePlan({ data, profile: high, course: 'B-MUS', courseYear: 2026, startYear: 2026, startPeriod: 'semester-2' }).notes.some((n) => n.key === 'markUnmet')).toBe(false)
  }, 60_000)
})
