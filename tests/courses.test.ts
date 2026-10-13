import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { checkCourse } from '../src/engine/courseRules'
import { defaultCourse, forCourse } from '../src/engine/forCourse'
import { generatePlan } from '../src/engine/generate'
import { periodsFor } from '../src/engine/availability'
import { pinnedIn } from '../src/engine/relieve'
import { checkTerms } from '../src/engine/planCheck'

/** More than one bachelor: categories, breadth and rules follow the student's own course. */
describe('per-course rules (B-SCI and B-COM)', () => {
  const { dataset: data } = buildDataset('real')
  const plan = (course: string, subjects: string[], completed: string[] = []) =>
    ({ course, courseYear: 2026, completed, terms: [{ year: 2027, period: 'semester-1', subjects }] }) as never

  it('a subject is breadth in one course and its own in the other', () => {
    expect(data.subjects.ECON10004!.categories).toMatchObject({ 'B-SCI': 'breadth', 'B-COM': 'commerce' })
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
  it("a 'core' subject counts towards the total only, never as unknown in a category", () => {
    const copy = structuredClone(data)
    copy.subjects.SCIE10005!.categories['B-SCI'] = 'core'
    const st = checkCourse(plan('B-SCI', ['SCIE10005']), copy).statuses
    expect(st.find((s) => s.ruleId === 'total')?.detail).toMatch(/^12\.5 /)
    const sci = st.find((s) => s.ruleId === 'science-l1')!
    expect(sci.params.have).toBe(0)
    expect(sci.params.uncategorised).toBe(0)
  })
  it('a heavy term that the chain forces says which subjects have nowhere else to go', () => {
    // Mid-year CSS start: COMP10002 can't come before 2028 S1, COMP20003 runs only in S2, and
    // SWEN30006 (needs SWEN20003) must be done before COMP30022, which also runs only in S2.
    const { plan: p } = generatePlan({ data, profile: { results: [], skills: {}, interests: [], goal: 'balanced' }, course: 'B-SCI', courseYear: 2026, major: 'computing-and-software-systems', startYear: 2027, startPeriod: 'semester-2' })
    const i = p.terms.findIndex((t) => t.subjects.includes('COMP20003'))
    expect(p.terms[i]!.subjects).toContain('SWEN20003')
    expect(pinnedIn(p, data, i, ['COMP20003', 'SWEN20003'])).toEqual(['COMP20003', 'SWEN20003'])
  })
  it('every B-COM major plans without clashes, Actuarial on the mathematics path', () => {
    for (const major of data.components.filter((c) => c.course === 'B-COM' && c.kind === 'major').map((c) => c.id)) {
      for (const startPeriod of ['semester-1', 'semester-2'] as const) {
        const { plan: p } = generatePlan({ data, profile: { results: [], skills: {}, interests: [], goal: 'balanced' }, course: 'B-COM', courseYear: 2026, major, startYear: 2027, startPeriod })
        expect(checkTerms(p, data).filter((i) => i.severity === 'error').map((i) => i.message), `${major} ${startPeriod}`).toEqual([])
        if (major === 'actuarial-studies') expect(p.terms.flatMap((t) => t.subjects)).not.toContain('ECON10005')
      }
    }
  })
  it('a points-only prerequisite counts the required subjects and adds no closed or no-credit ones', () => {
    for (const major of ['management', 'marketing']) {
      const { plan: p } = generatePlan({ data, profile: { results: [], skills: {}, interests: [], goal: 'balanced' }, course: 'B-COM', courseYear: 2026, major, startYear: 2026, startPeriod: 'semester-1' })
      const all = p.terms.flatMap((t) => t.subjects)
      expect(all).not.toContain('ACCT10002')
      const st = checkCourse(p, data).statuses
      for (const id of ['level1-cap', 'breadth-cap', 'breadth-l1-cap']) expect(st.find((x) => x.ruleId === id)?.status, `${major} ${id}`).not.toBe('fail')
    }
  })

  it('a choice never picks a subject whose prerequisite never runs', () => {
    const r = generatePlan({ data, profile: { results: [], skills: {}, interests: [], goal: 'balanced' }, course: 'B-COM', courseYear: 2026, major: 'business-analytics', startYear: 2026, startPeriod: 'semester-1' })
    expect(r.unplaced.map((u) => u.code)).toEqual([])
  })

  it('a view for one course turned into another starts from the full data', () => {
    expect(periodsFor(forCourse(forCourse(data, 'B-SCI'), 'B-COM').subjects.ECON10004!, 2026)).toContain('semester-1')
  })

  it('a subject closed to the course is an error in the plan check', () => {
    const issues = checkTerms(plan('B-COM', ['ACCT10002']), data)
    expect(issues.some((i) => i.kind === 'closed-to-course' && i.subject === 'ACCT10002')).toBe(true)
  })
})
