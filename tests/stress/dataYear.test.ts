import { afterEach, describe, expect, it } from 'vitest'
import { setToday } from '../../src/engine/dataYear'
import { generatePlan } from '../../src/engine/generate'
import { assumedOfferings, checkTerms } from '../../src/engine/planCheck'
import type { Profile } from '../../src/engine/recommend'
import { realData } from '../realData'

/*
 * The year rollover on real plans (the clock injected with setToday, never the real date). A
 * couple of these plans run in tests/dataYear.test.ts too, for test:fast.
 */
const data = realData()
const profile: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
const PLANS: [string, string | undefined][] = [
  ['B-SCI', undefined],
  ['B-SCIEXTD', 'chemistry'],
  ['B-ARTS', 'spanish-and-latin-american-studies'],
]
const plansFrom = (startYear: number) =>
  PLANS.map(([course, major]) => generatePlan({ data, profile, course, courseYear: 2026, major, startYear, startPeriod: 'semester-1' }).plan)

afterEach(() => setToday(undefined))

describe('the year rollover on real plans, data from the 2026 Handbook only', () => {
  it('planner checks on real plans do not depend on the clock', () => {
    setToday('2026-10-26')
    const before = plansFrom(2027).map((p) => checkTerms(p, data))
    setToday('2027-01-05')
    const after = plansFrom(2027).map((p) => checkTerms(p, data))
    expect(after).toEqual(before)
  }, 60_000)

  it('no "not offered in 2027" errors on real plans starting in 2027, in January 2027', () => {
    setToday('2027-01-05')
    for (const p of plansFrom(2027)) {
      const issues = checkTerms(p, data)
      expect(issues.filter((i) => i.kind === 'not-offered')).toEqual([])
      // Each 2027 subject is planned on its 2026 timetable, said once for the plan, not per subject.
      expect(issues.some((i) => i.kind === 'offering-assumed')).toBe(false)
      expect(assumedOfferings(p, data)).toEqual({ year: 2027, from: 2026 })
    }
  }, 60_000)
})
