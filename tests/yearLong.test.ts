import { describe, expect, it } from 'vitest'
import { generatePlan } from '../src/engine/generate'
import { checkCourse } from '../src/engine/courseRules'
import { checkTerms } from '../src/engine/planCheck'
import { offeredIn } from '../src/engine/availability'
import { termStress } from '../src/engine/termStress'
import { doneBefore, fitsLoad, recordedLoads, termLoad } from '../src/engine/yearLong'
import type { Plan } from '../src/engine/plan'
import { realData } from './realData'
import { dataset, subject } from './helpers'

const both = { '2026': ['semester-1', 'semester-2'] }
const data = dataset([
  subject({ code: 'YRLG10001', points: 50, year_long: true, offerings: both, prerequisites: 'none' }),
  subject({ code: 'YRLG20001', points: 25, year_long: true, offerings: both, prerequisites: 'YRLG10001' }),
  subject({ code: 'SEMS20001', points: 12.5, offerings: both, prerequisites: 'YRLG10001' }),
  subject({ code: 'SEMS10001', points: 12.5, offerings: both, prerequisites: 'none' }),
])
const plan = (terms: Plan['terms']): Plan => ({ course: 'X', courseYear: 2026, completed: [], terms })

describe('year-long subjects', () => {
  it('start only in Semester 1', () => {
    const s = data.subjects.YRLG10001!
    expect(offeredIn(s, 2026, 'semester-1').status).toBe('ok')
    expect(offeredIn(s, 2026, 'semester-2').status).toBe('fail')
  })

  it('put half their points on Semester 1 and half on Semester 2', () => {
    const terms = [
      { year: 2026, period: 'semester-1' as const, subjects: ['YRLG10001', 'SEMS10001'] },
      { year: 2026, period: 'semester-2' as const, subjects: [] },
    ]
    expect(termLoad(terms, 0, data)).toBe(37.5)
    expect(termLoad(terms, 1, data)).toBe(25)
  })

  it('a year-long 75-point subject is not an overload', () => {
    const big = dataset([subject({ code: 'YRLG30001', points: 75, year_long: true, offerings: both, prerequisites: 'none' })])
    const p = plan([
      { year: 2026, period: 'semester-1', subjects: ['YRLG30001'] },
      { year: 2026, period: 'semester-2', subjects: [] },
    ])
    expect(checkTerms(p, big).filter((i) => i.kind === 'overload')).toEqual([])
  })

  it('are finished only after Semester 2: a subject needing one waits for the next year', () => {
    const p = plan([
      { year: 2026, period: 'semester-1', subjects: ['YRLG10001'] },
      { year: 2026, period: 'semester-2', subjects: ['SEMS20001'] },
      { year: 2027, period: 'semester-1', subjects: ['YRLG20001'] },
    ])
    expect(doneBefore([], p.terms, 1, data).has('YRLG10001')).toBe(false)
    expect(doneBefore([], p.terms, 2, data).has('YRLG10001')).toBe(true)
    const errors = checkTerms(p, data).filter((i) => i.kind === 'prereq-unmet').map((i) => i.subject)
    expect(errors).toEqual(['SEMS20001'])
  })

  it('count their points once towards the course', () => {
    const p = plan([
      { year: 2026, period: 'semester-1', subjects: ['YRLG10001'] },
      { year: 2026, period: 'semester-2', subjects: [] },
    ])
    expect(checkTerms(p, data).some((i) => i.kind === 'duplicate')).toBe(false)
    expect(termLoad(p.terms, 0, data) + termLoad(p.terms, 1, data)).toBe(50)
  })

  it('spread their assessment tasks over both semesters', () => {
    const tasks = Array.from({ length: 10 }, () => ({ kind: 'assignment', weight: 10 }))
    const mk = (code: string, yearLong: boolean) => subject({ code, offerings: both, prerequisites: 'none', assessment: tasks, year_long: yearLong })
    const codes = ['AAAA10001', 'AAAA10002', 'AAAA10003']
    const plain = termStress(codes, dataset(codes.map((c) => mk(c, false))))
    const long = termStress(codes, dataset(codes.map((c) => mk(c, true))))
    expect(plain.reasons.some((r) => r.key === 'deadlines')).toBe(true)
    expect(long.reasons.some((r) => r.key === 'deadlines')).toBe(false)
  })
})

describe('year-long subjects on the record and in swaps', () => {
  it('a recorded year-long result puts half its points on each semester of its year', () => {
    const results = [
      { code: 'YRLG10001', year: 2026, period: 'semester-1' as const, mark: 70 },
      { code: 'SEMS10001', year: 2026, period: 'semester-1' as const, mark: 70 },
    ]
    expect(recordedLoads(results, data)).toEqual({ '2026|semester-1': 37.5, '2026|semester-2': 25 })
  })

  it('room for a year-long subject counts half here and needs room in Semester 2', () => {
    const terms = (s2: string[]) => [
      { year: 2026, period: 'semester-1' as const, subjects: [] },
      { year: 2026, period: 'semester-2' as const, subjects: s2 },
    ]
    // 25 of 50 points in Semester 1: fits.
    expect(fitsLoad(terms([]), 0, 'YRLG10001', data, 50)).toBe(true)
    // Semester 2 already holds 37.5 points: no room for the second 25.
    const full = dataset([...Object.values(data.subjects), subject({ code: 'BIGG10001', points: 37.5, offerings: both, prerequisites: 'none' })])
    expect(fitsLoad(terms(['BIGG10001']), 0, 'YRLG10001', full, 50)).toBe(false)
    // No Semester 2 in the plan at all.
    expect(fitsLoad([{ year: 2026, period: 'semester-1', subjects: [] }], 0, 'YRLG10001', data, 50)).toBe(false)
    // An ordinary subject only needs room in its own term.
    expect(fitsLoad(terms(['BIGG10001']), 0, 'SEMS10001', full, 50)).toBe(true)
  })
})

describe('Bachelor of Oral Health (real data)', () => {
  it('plans each year of year-long subjects in its own year, with every rule met', () => {
    const real = realData()
    const { plan: p, unplaced } = generatePlan({ data: real, profile: { results: [], skills: {}, interests: [], goal: 'balanced' }, course: '841AC', courseYear: 2026, startYear: 2027, startPeriod: 'semester-1' })
    expect(unplaced).toEqual([])
    const s1 = p.terms.filter((t) => t.period === 'semester-1').map((t) => [...t.subjects].sort())
    expect(s1).toEqual([
      ['ORAL10001', 'ORAL10003', 'ORAL10005'],
      ['ORAL20001', 'ORAL20003', 'ORAL20005'],
      ['ORAL30001', 'ORAL30002'],
    ])
    expect(p.terms.map((_, i) => termLoad(p.terms, i, real))).toEqual([50, 50, 50, 50, 50, 50])
    expect(checkCourse(p, real).statuses.filter((s) => s.status === 'fail')).toEqual([])
    expect(checkTerms(p, real).filter((i) => i.severity === 'error')).toEqual([])
  })
})
