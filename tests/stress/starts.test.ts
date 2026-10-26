import { describe, expect, it } from 'vitest'
import { checkCourse } from '../../src/engine/courseRules'
import { generatePlan } from '../../src/engine/generate'
import { checkTerms } from '../../src/engine/planCheck'
import type { Profile } from '../../src/engine/recommend'
import type { Period } from '../../src/engine/schema'
import { realData } from '../realData'

/**
 * Every course, with no major chosen, from each start (real data): a whole-degree plan with every
 * required subject placed, no term errors and every course rule met. A cheap slice of the full
 * every-major check.
 *
 * Known exception: B-SCIEXTD's foundation year can't be done in the first year from a mid-year
 * start (MAST10015 runs in Semester 2 only, after MAST10014 in Semester 1 only); the plan places
 * them as early as it can and says so.
 */
const EXPECTED = new Set(['B-SCIEXTD semester-2 foundation'])
const data = realData()
const profile: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
// Memoised, so the mid-year sweep below reuses the no-major plans the start sweep already built.
const plans = new Map<string, ReturnType<typeof generatePlan>>()
const plan = (course: string, major: string | undefined, startPeriod: Period, courseYear = 2026) => {
  const key = `${course}|${courseYear}|${major ?? ''}|${startPeriod}`
  if (!plans.has(key)) plans.set(key, generatePlan({ data, profile, course, courseYear, major, startYear: 2027, startPeriod }))
  return plans.get(key)!
}

describe('every course plans from every start (real data)', () => {
  for (const period of ['semester-1', 'semester-2', 'summer'] as Period[]) {
    it(`starting in ${period}`, () => {
      const problems: string[] = []
      for (const course of data.courses) {
        const { plan: p, unplaced } = plan(course.code, undefined, period, course.year)
        for (const u of unplaced) problems.push(`${course.code} ${period} unplaced ${u.code}`)
        for (const i of checkTerms(p, data).filter((x) => x.severity === 'error')) problems.push(`${course.code} ${period} ${i.kind} ${i.subject ?? ''}`)
        for (const s of checkCourse(p, data).statuses.filter((x) => x.status === 'fail')) problems.push(`${course.code} ${period} ${s.ruleId}`)
        if (p.terms.filter((t) => t.period === 'semester-1' || t.period === 'semester-2').length > 10) problems.push(`${course.code} ${period} over ten semesters`)
      }
      expect(problems.filter((p) => !EXPECTED.has(p))).toEqual([])
    }, 300_000)
  }
})

describe('a mid-year start places every required subject (real data)', () => {
  // Each a Semester 2-only subject after a Semester 1-only one, or a chain of them. A few of
  // these run in generateStarts.test.ts too, for test:fast.
  const cases: [string, string | undefined][] = [
    ['B-FATH', undefined],
    ['B-FAANIM', undefined],
    ['B-FAFILMTV', undefined],
    ['B-FASCWRI', undefined],
    ['B-ARTS', 'spanish-and-latin-american-studies'],
    ['B-SCIEXTD', 'chemistry'],
  ]
  it.each(cases)('%s %s', (course, major) => {
    const { plan: p, unplaced } = plan(course, major, 'semester-2')
    expect(unplaced).toEqual([])
    expect(checkTerms(p, data).filter((i) => i.severity === 'error')).toEqual([])
    expect(p.terms.length).toBeLessThanOrEqual(10)
  }, 60_000)
})
