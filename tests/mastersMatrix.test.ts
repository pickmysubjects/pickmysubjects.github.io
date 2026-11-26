import { describe, expect, it } from 'vitest'
import { realData } from './realData'

// Every coursework master's specialisation, from Semester 1 and Semester 2, full-time and
// part-time: only the course's own subjects, nothing left out, every rule met, and no more than
// one semester past the fewest the points need.
describe("master's plans across every specialisation, start and load", async () => {
  const { generatePlan } = await import('../src/engine/generate')
  const { checkCourse } = await import('../src/engine/courseRules')
  const data = realData()
  const masters = data.courses.filter((c) => c.code.startsWith('MC-'))
  const profile = { results: [], skills: {}, interests: [], goal: 'balanced' } as never
  for (const course of masters) {
    for (const spec of data.components.filter((c) => c.course === course.code)) {
      for (const startPeriod of ['semester-1', 'semester-2'] as const) {
        for (const load of [50, 25]) {
          it(`${spec.id} from ${startPeriod}, ${load} a semester`, () => {
            const r = generatePlan({ data, profile, course: course.code, courseYear: 2027, specialisation: spec.id, startYear: 2027, startPeriod, load })
            const codes = r.plan.terms.flatMap((t) => t.subjects)
            expect(codes.filter((c) => data.subjects[c]?.categories[course.code] === undefined), 'outside the course').toEqual([])
            expect(r.unplaced.map((u) => u.code), 'left out').toEqual([])
            const check = checkCourse({ ...r.plan, course: course.code, courseYear: 2027, specialisation: spec.id } as never, data)
            expect(check.statuses.filter((s) => s.status === 'fail').map((s) => `${s.ruleId}: ${s.detail}`)).toEqual([])
            const semesters = r.plan.terms.filter((t) => t.subjects.length && t.period.startsWith('semester')).length
            expect(semesters, 'semesters').toBeLessThanOrEqual(Math.ceil(course.totalPoints / load) + 1)
          })
        }
      }
    }
  }
})
