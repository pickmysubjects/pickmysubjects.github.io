import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { usePlan } from '../src/composables/usePlan'
import { useProfile } from '../src/composables/useProfile'
import { provideDataset } from '../src/composables/useDataset'
import { books, commencementYear } from '../src/composables/planStore'
import { setToday } from '../src/engine/dataYear'
import { checkCourse, checkTerms, generatePlan, hasEnded, passedCodes, upcomingStart, type Period, type Profile } from '../src/engine'
import { recordTermChoices } from '../src/utils/pastTerms'
import { realData } from './realData'

// Scenarios from a planner audit: a student part-way through a degree, planned on from today.
const data = realData()
beforeAll(() => provideDataset(data))
afterEach(() => setToday(undefined))

const empty: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
const pts = (cs: string[]) => cs.reduce((s, c) => s + (data.subjects[c]?.points ?? 12.5), 0)

/** The engine's own plan for a start, its first `n` semesters as a record (marks 72, one optional fail). */
function recordFrom(course: string, major: string, n: number, fail?: (codes: string[]) => string | undefined): Profile['results'] {
  const g = generatePlan({ data, profile: empty, course, courseYear: 2026, major, startYear: 2025, startPeriod: 'semester-1' })
  const done = g.plan.terms.filter((t) => t.period === 'semester-1' || t.period === 'semester-2').slice(0, n)
  const failed = fail?.(done.flatMap((t) => t.subjects))
  return done.flatMap((t) => t.subjects.map((code) => ({ code, year: t.year, period: t.period, mark: code === failed ? 40 : 72 })))
}

describe('a plan never fills semesters that have already begun', () => {
  it('upcomingStart moves a past or running start to the next semester still ahead', () => {
    setToday('2026-10-26') // mid Semester 2
    expect(upcomingStart({ year: 2025, period: 'semester-1' })).toEqual({ year: 2027, period: 'semester-1' })
    expect(upcomingStart({ year: 2026, period: 'semester-2' })).toEqual({ year: 2027, period: 'semester-1' })
    expect(upcomingStart({ year: 2027, period: 'semester-2' })).toEqual({ year: 2027, period: 'semester-2' })
    setToday('2026-03-10')
    expect(upcomingStart({ year: 2025, period: 'semester-2' })).toEqual({ year: 2026, period: 'semester-2' })
    expect(hasEnded({ year: 2026, period: 'semester-1' }, new Date('2026-10-26'))).toBe(true)
    expect(hasEnded({ year: 2026, period: 'semester-2' }, new Date('2026-10-26'))).toBe(false)
  })

  it('a 2025 starter with an undated record is planned from 2027, the record counted as done', () => {
    setToday('2026-10-26')
    const undated = recordFrom('B-SCI', 'computing-and-software-systems', 4).map(({ code, mark }) => ({ code, mark }))
    const { setResults } = useProfile()
    setResults(undated)
    const plan = usePlan()
    plan.updateSetup({ ...plan.setup.value, course: 'B-SCI', courseYear: 2026, major: 'computing-and-software-systems', specialisation: '', startYear: 2025, startPeriod: 'semester-1' })
    plan.generate()
    const first = plan.terms.value[0]!
    expect(first.year * 10 + (first.period === 'semester-2' ? 2 : 1)).toBeGreaterThanOrEqual(20271)
    const planned = plan.terms.value.flatMap((t) => t.subjects)
    expect(planned.filter((c) => undated.some((r) => r.code === c))).toEqual([])
    expect(pts([...passedCodes(undated), ...planned])).toBe(300)
    setResults([])
  })

  it("the record's semester list reaches back six years, before a later plan start", () => {
    const now = new Date('2026-10-26')
    const choices = recordTermChoices([{ year: 2026, period: 'semester-1' }], now)
    expect(choices[0]).toEqual({ year: 2020, period: 'semester-1' })
    expect(choices).toContainEqual({ year: 2025, period: 'semester-1' })
    expect(choices.at(-1)).toEqual({ year: 2028, period: 'semester-2' })
    // An even earlier start is still offered.
    expect(recordTermChoices([{ year: 2018, period: 'semester-2' }], now)[0]).toEqual({ year: 2018, period: 'semester-2' })
  })
})

describe('rules come from the year the student started', () => {
  it('stored commencement year wins; older plans derive it from the start or the record', () => {
    expect(commencementYear({ startYear: 2027, commencementYear: 2024 })).toBe(2024)
    expect(commencementYear({ startYear: 2026 })).toBe(2026)
    expect(commencementYear({ startYear: 2026 }, [{ code: 'X', year: 2025, period: 'semester-1' as Period }, { code: 'Y' }])).toBe(2025)
  })
  it('a 2025 start is judged on 2025 rules (the nearest we have when 2025 is missing)', () => {
    const plan = usePlan()
    plan.updateSetup({ ...plan.setup.value, course: 'B-SCI', courseYear: 2026, major: '', specialisation: '', startYear: 2025, startPeriod: 'semester-1', commencementYear: undefined })
    expect(plan.plan.value.courseYear).toBe(2025)
    expect(plan.setup.value.courseYear).toBe(2025)
    // No 2025 B-SCI rules in the data: the nearest year's course stands in (the planner says so).
    expect(plan.course.value?.year).toBe(2026)
  })
})

describe('changing major after two years', () => {
  // Points over 300 here are needed (subjects from the old major don't count towards the new
  // one's rules or prerequisites); none is a spare elective, and the plan says why.
  for (const [from, to] of [['computing-and-software-systems', 'data-science'], ['criminology', 'arts-psychology']] as const) {
    it(`${from} → ${to}: every planned subject is needed, and the extra points are explained`, () => {
      const course = from === 'criminology' ? 'B-ARTS' : 'B-SCI'
      const results = recordFrom(course, from, 4)
      const r = generatePlan({ data, profile: { ...empty, results }, course, courseYear: 2025, major: to, startYear: 2027, startPeriod: 'semester-1' })
      const completed = passedCodes(results)
      const plan = { ...r.plan, completed }
      const planned = plan.terms.flatMap((t) => t.subjects)
      const total = pts([...completed, ...planned])
      expect(r.unplaced).toEqual([])
      expect(checkCourse(plan, data).statuses.filter((s) => s.status === 'fail')).toEqual([])
      for (const code of planned) {
        const without = { ...plan, terms: plan.terms.map((t) => ({ ...t, subjects: t.subjects.filter((c) => c !== code) })) }
        const breaks = checkCourse(without, data).statuses.some((s) => s.status === 'fail') || checkTerms(without, data).some((i) => i.severity === 'error')
        expect(breaks, `${code} is a spare elective`).toBe(true)
      }
      if (total > 300) expect(r.notes.find((n) => n.key === 'overTotal')?.params).toMatchObject({ points: total, extra: total - 300, total: 300 })
    })
  }
})

describe('a failed subject planned again', () => {
  it('is noted as a retake, not as a new prerequisite', () => {
    const results = recordFrom('B-SCI', 'computing-and-software-systems', 4, (cs) => cs.find((c) => /^COMP2/.test(c)))
    const failed = results.find((r) => (r.mark ?? 100) < 50)!.code
    const r = generatePlan({ data, profile: { ...empty, results }, course: 'B-SCI', courseYear: 2025, major: 'computing-and-software-systems', startYear: 2027, startPeriod: 'semester-1' })
    expect(r.plan.terms.flatMap((t) => t.subjects)).toContain(failed)
    expect(r.notes.some((n) => n.key === 'prereqAdded' && n.params.code === failed)).toBe(false)
    expect(r.notes.some((n) => (n.key === 'retake' || n.key === 'retakeFor') && n.params.code === failed)).toBe(true)
  })
})

it('no saved plans leak between files', () => {
  books.value = {}
})
