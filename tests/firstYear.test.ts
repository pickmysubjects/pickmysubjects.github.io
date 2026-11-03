import { describe, expect, it } from 'vitest'
import { ADMISSION_STEPS, ADMISSION_YEAR } from '@/content/admissions'
import { firstYear } from '@/engine/firstYear'
import { KEY_DATES } from '@/utils/keyDates'
import firstYears from '@/generated/first-year.json'
import { realData } from './realData'

const data = realData()

describe('dates from results to the first day', () => {
  it("runs in order, and the University's own dates follow VTAC's", () => {
    const dates = ADMISSION_STEPS.map((s) => s.date)
    expect([...dates].sort()).toEqual(dates)
    const orientation = KEY_DATES.find((d) => d.kind === 'orientation' && d.term === 'semester-1' && d.year === ADMISSION_YEAR)
    expect(orientation).toBeDefined()
    expect(orientation!.start > ADMISSION_STEPS.at(-1)!.end!).toBe(true)
  })
})

describe("a degree's first year", () => {
  it('names the set subjects and leaves electives to the student', () => {
    const fy = firstYear(data, 'B-COM')
    const set = fy.semesters.flat().flatMap((s) => (s.kind === 'set' ? [s.code] : []))
    expect(set).toContain('ECON10004')
    // An elective is a kind of subject, never the planner's own pick.
    for (const s of fy.semesters.flat()) if (s.kind === 'elective') expect(s).not.toHaveProperty('code')
  }, 30_000)

  it('is worked out for every degree; semester 2 is empty only after year-long subjects', () => {
    const years = firstYears as unknown as Record<string, { code?: string }[][]>
    expect(Object.keys(years).sort()).toEqual([...new Set(data.courses.map((c) => c.code))].sort())
    for (const [course, sems] of Object.entries(years)) {
      expect(sems[0]!.length, course).toBeGreaterThan(0)
      if (!sems[1]!.length) expect(sems[0]!.some((s) => s.code && data.subjects[s.code]?.yearLong), course).toBe(true)
    }
  })
})
