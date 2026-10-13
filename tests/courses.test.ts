import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { checkCourse } from '../src/engine/courseRules'
import { defaultCourse, forCourse } from '../src/engine/forCourse'
import { generatePlan } from '../src/engine/generate'
import { periodsFor } from '../src/engine/availability'

/** More than one bachelor: categories, breadth and rules follow the student's own course. */
describe('per-course rules (B-SCI and B-COM)', () => {
  const { dataset: data } = buildDataset('real')
  const plan = (course: string, subjects: string[], completed: string[] = []) =>
    ({ course, courseYear: 2026, completed, terms: [{ year: 2027, period: 'semester-1', subjects }] }) as never

  it('a subject is breadth in one course and its own in the other', () => {
    expect(data.subjects.ECON10004!.categories).toMatchObject({ 'B-SCI': 'breadth', 'B-COM': 'discipline' })
    expect(data.subjects.MAST10006!.categories).toMatchObject({ 'B-SCI': 'science', 'B-COM': 'breadth' })
  })

  it('a subject closed to a course gets no category there, so it is never planned for it', () => {
    expect(data.subjects.ACCT10002!.categories['B-COM']).toBeUndefined()
    const { plan: p } = generatePlan({ data, profile: { results: [], skills: {}, interests: [], goal: 'balanced' }, course: 'B-COM', courseYear: 2026, major: 'finance', startYear: 2027, startPeriod: 'semester-1' })
    expect(p.terms.flatMap((t) => t.subjects)).not.toContain('ACCT10002')
  })

  it('breadth students see only the breadth periods', () => {
    expect(periodsFor(forCourse(data, 'B-SCI').subjects.ECON10004!, 2026)).not.toContain('semester-1')
    expect(periodsFor(forCourse(data, 'B-COM').subjects.ECON10004!, 2026)).toContain('semester-1')
  })

  it('a requirement with two paths passes on either and fails on neither', () => {
    const status = (subjects: string[]) => checkCourse(plan('B-COM', subjects), data).statuses.find((s) => s.ruleId === 'quantitative')?.status
    expect(status(['ECON10005', 'ECOM20001'])).toBe('ok')
    expect(status(['MAST20005', 'MAST20004'])).toBe('ok')
    expect(status(['ECON10005', 'MAST20004'])).toBe('fail')
  })

  it('the planner puts the first-semester subject first and meets the foundation and quantitative rules', () => {
    const { plan: p } = generatePlan({ data, profile: { results: [], skills: {}, interests: [], goal: 'balanced' }, course: 'B-COM', courseYear: 2026, startYear: 2027, startPeriod: 'semester-1' })
    expect(p.terms[0]!.subjects).toContain('ECON10004')
    const st = checkCourse(p, data).statuses
    for (const id of ['econ10004', 'foundation', 'quantitative']) expect(st.find((s) => s.ruleId === id)?.status).toBe('ok')
  })

  it('a new visitor starts in the course with the most majors', () => {
    expect(defaultCourse(data)).toBe('B-SCI')
  })
})
