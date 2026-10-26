import { describe, expect, it } from 'vitest'
import { checkCourse, componentCourse, diplomaClash, findDiploma, planRules } from '../src/engine/courseRules'
import { evaluateField } from '../src/engine/expr'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import { realData } from './realData'
import { decodePlan, encodePlan } from '../src/utils/sharePlan'

const real = realData()
const profile = { results: [], skills: {}, interests: [], goal: 'balanced' as const }
const plan = (course: string, major: string, diploma?: string, diplomaStream?: string) =>
  generatePlan({ data: real, profile, course, courseYear: 2026, major, minors: [], diploma, diplomaStream, startYear: 2026, startPeriod: 'semester-1' })
const failing = (p: ReturnType<typeof plan>['plan']) => checkCourse(p, real).statuses.filter((s) => s.status === 'fail').map((s) => s.ruleId)
const points = (p: ReturnType<typeof plan>['plan']) => p.terms.flatMap((t) => t.subjects).reduce((sum, c) => sum + (real.subjects[c]?.points ?? 12.5), 0)

describe('Bachelor of Science (Extended)', () => {
  it('loads cleanly and runs on B-SCI majors and categories', () => {
    expect(componentCourse(real, 'B-SCIEXTD')).toBe('B-SCI')
    expect(componentCourse(real, 'B-ARTS')).toBe('B-ARTS')
    // Science and breadth as B-SCI counts them; its own foundation subjects count towards the total only.
    expect(real.subjects.MAST20031?.categories['B-SCIEXTD']).toBe('science')
    expect(real.subjects.MAST10014?.categories['B-SCIEXTD']).toBe('core')
    expect(real.subjects.SCIE10005?.categories['B-SCIEXTD']).toBe('core')
  })

  it('is admitted wherever B-SCI is, and to a B-SCI major’s subjects through that major', () => {
    const ctx = (admittedCourse: string, majors?: string[]) => ({ completed: new Set(Object.keys(real.subjects)), subjects: real.subjects, admittedCourse, majors })
    // "B-SCI students: 175 points" (AGRI30038).
    expect(evaluateField(real.subjects.AGRI30038!.prerequisites, ctx('B-SCIEXTD')).status).toBe('ok')
    expect(evaluateField(real.subjects.AGRI30038!.prerequisites, ctx('B-ARTS')).status).toBe('fail')
    // "… Biomedical Engineering Systems major in the B-SCI" (BMEN30008).
    expect(evaluateField(real.subjects.BMEN30008!.prerequisites, ctx('B-SCIEXTD', ['Biomedical Engineering Systems'])).status).toBe('ok')
    // The same condition, held in B-SCIEXTD, sits beside the original rather than replacing it.
    expect(JSON.stringify(real.subjects.BMEN30008!.prerequisites)).toMatch(/major in the B-SCI Bachelor.*major in the B-SCIEXTD Bachelor/)
  })

  it('plans 350 points in seven semesters, the foundation subjects in the first year', () => {
    const { plan: p, unplaced } = plan('B-SCIEXTD', 'zoology')
    expect(unplaced).toEqual([])
    expect(points(p)).toBe(350)
    expect(p.terms.filter((t) => t.period === 'semester-1' || t.period === 'semester-2')).toHaveLength(7)
    expect(failing(p)).toEqual([])
    const firstYear = p.terms.slice(0, 2).flatMap((t) => t.subjects)
    for (const c of ['MAST10014', 'MAST10015', 'SCIE10005', 'SCIE10007', 'SCIE10010']) expect(firstYear).toContain(c)
  })
})

describe('concurrent diplomas', () => {
  it('rules out the majors the Handbook names', () => {
    const comp = findDiploma(real, 'D-COMP')!
    expect(diplomaClash(real, comp, { major: 'data-science' })).toMatch(/Data Science/)
    expect(diplomaClash(real, comp, { major: 'genetics' })).toBeNull()
    const lang = findDiploma(real, 'D-LANG')!
    // The same language as the degree's own major isn't a diploma on top of it.
    expect(diplomaClash(real, lang, { major: 'french-studies', diplomaStream: 'french-studies' })).not.toBeNull()
  })

  it.each([
    ['B-ARTS', 'history', 'D-LANG', 'french-studies'],
    ['B-SCI', 'genetics', 'D-COMP', undefined],
    ['B-COM', 'finance', 'D-MATHSC', 'mathematics-and-statistics-statistics'],
  ])('%s %s + %s %s: a year longer, every rule met', (course, major, diploma, stream) => {
    const { plan: p, unplaced } = plan(course, major, diploma, stream)
    expect(unplaced).toEqual([])
    expect(points(p)).toBe(400)
    expect(failing(p)).toEqual([])
    expect(checkTerms(p, real).filter((i) => i.severity === 'error')).toEqual([])
    // The diploma's own rules are reported after the degree's.
    expect(checkCourse(p, real).statuses.some((s) => s.ruleId.startsWith(`${diploma}:`))).toBe(true)
  })

  it('keeps diploma subjects out of the degree beyond the cross-credit', () => {
    const { plan: p } = plan('B-ARTS', 'history', 'D-LANG', 'french-studies')
    // Without the diploma the same subjects all count for the degree; with it, the degree's arts
    // total drops by the diploma's own points (100, less up to 50 cross-credited).
    const arts = (withDiploma: boolean) => Number(checkCourse(withDiploma ? p : { ...p, diploma: undefined }, real).statuses.find((s) => s.ruleId === 'arts')!.params.have)
    expect(arts(false) - arts(true)).toBeGreaterThanOrEqual(50)
    expect(arts(false) - arts(true)).toBeLessThanOrEqual(100)
  })

  it('reports a missing stream and lists the diploma’s rules', () => {
    const { plan: p } = plan('B-SCI', 'genetics')
    const check = checkCourse({ ...p, diploma: 'D-LANG' }, real)
    expect(check.statuses.find((s) => s.ruleId === 'D-LANG:stream')?.status).toBe('unknown')
    expect(check.statuses.find((s) => s.ruleId === 'D-LANG:diploma-total')?.status).toBe('fail')
    expect(planRules(real, { course: 'B-SCI', courseYear: 2026, diploma: 'D-LANG' }).map((r) => r.id)).toContain('D-LANG:stream')
  })

  it('travels in a shared link', () => {
    const setup = { course: 'B-ARTS', courseYear: 2026, startYear: 2026, startPeriod: 'semester-1' as const, major: 'history', specialisation: '', minors: [] as string[], diploma: 'D-LANG', diplomaStream: 'french-studies' }
    expect(decodePlan(encodePlan(setup, []))?.setup).toMatchObject({ diploma: 'D-LANG', diplomaStream: 'french-studies' })
  })
})
