import { describe, expect, it } from 'vitest'
import { offeredIn } from '../src/engine/availability'
import { checkCourse } from '../src/engine/courseRules'
import type { Plan } from '../src/engine/plan'
import { standardTerms } from '../src/engine/plan'
import { checkTerms } from '../src/engine/planCheck'
import { dataset, demo, subject } from './helpers'

describe('offeredIn', () => {
  const s = subject({ code: 'AAAA10001', offerings: { 2025: ['semester-1'], 2026: ['semester-2'] } })

  it('uses the exact year when curated', () => {
    expect(offeredIn(s, 2026, 'semester-2')).toEqual({ status: 'ok' })
    expect(offeredIn(s, 2026, 'semester-1')).toEqual({ status: 'fail' })
  })

  it('carries the latest earlier year forward as an assumption', () => {
    expect(offeredIn(s, 2028, 'semester-2')).toEqual({ status: 'ok', assumedFromYear: 2026 })
  })

  it('is unknown when offerings are not curated', () => {
    expect(offeredIn(subject({ code: 'AAAA10002' }), 2026, 'semester-1')).toEqual({ status: 'unknown' })
  })
})

describe('standardTerms', () => {
  it('alternates semesters and rolls the year', () => {
    expect(standardTerms(2027, 'semester-2', 3).map((t) => `${t.year} ${t.period}`)).toEqual([
      '2027 semester-2',
      '2028 semester-1',
      '2028 semester-2',
    ])
  })
})

describe('checkTerms', () => {
  const data = dataset([
    subject({ code: 'AAAA10001', offerings: { 2026: ['semester-1', 'semester-2'] }, prerequisites: 'none', non_allowed: [] }),
    subject({ code: 'AAAA20001', level: 2, offerings: { 2026: ['semester-2'] }, prerequisites: 'AAAA10001', non_allowed: ['BBBB20001'] }),
    subject({ code: 'BBBB20001', level: 2, offerings: { 2026: ['semester-1', 'semester-2'] }, prerequisites: 'none', non_allowed: [] }),
    subject({ code: 'CCCC20001', level: 2, offerings: { 2026: ['semester-1'] }, prerequisites: 'none', corequisites: 'AAAA10001', non_allowed: [] }),
  ])
  const plan = (terms: Plan['terms'], completed: string[] = []): Plan => ({ course: 'X', courseYear: 2026, completed, terms })
  const kinds = (p: Plan) => checkTerms(p, data).map((i) => i.kind)

  it('requires prerequisites in an earlier term, not the same one', () => {
    const same = plan([{ year: 2026, period: 'semester-2', subjects: ['AAAA10001', 'AAAA20001'] }])
    expect(kinds(same)).toContain('prereq-unmet')
    const earlier = plan([
      { year: 2026, period: 'semester-1', subjects: ['AAAA10001'] },
      { year: 2026, period: 'semester-2', subjects: ['AAAA20001'] },
    ])
    expect(kinds(earlier)).not.toContain('prereq-unmet')
  })

  it('accepts corequisites in the same term', () => {
    expect(kinds(plan([{ year: 2026, period: 'semester-1', subjects: ['CCCC20001', 'AAAA10001'] }]))).not.toContain('coreq-unmet')
    expect(kinds(plan([{ year: 2026, period: 'semester-1', subjects: ['CCCC20001'] }]))).toContain('coreq-unmet')
  })

  it('flags subjects placed in a period they do not run', () => {
    const p = plan([{ year: 2026, period: 'semester-1', subjects: ['AAAA20001'] }], ['AAAA10001'])
    expect(kinds(p)).toEqual(['not-offered'])
  })

  it('flags non-allowed pairs once, including against completed subjects', () => {
    const p = plan([{ year: 2026, period: 'semester-2', subjects: ['AAAA20001'] }], ['AAAA10001', 'BBBB20001'])
    expect(kinds(p).filter((k) => k === 'non-allowed')).toHaveLength(1)
  })

  it('flags duplicates, overloads and uncurated subjects', () => {
    const p = plan([
      { year: 2026, period: 'semester-1', subjects: ['AAAA10001', 'BBBB20001', 'CCCC20001', 'AAAA20001', 'ZZZZ10001', 'AAAA10001'] },
    ])
    const k = kinds(p)
    expect(k).toContain('duplicate')
    expect(k).toContain('not-in-dataset')
    expect(k).toContain('overload') // 5 known entries × 12.5 = 62.5 (the uncurated one adds nothing)
  })
})

describe('checkCourse (demo course)', () => {
  const data = demo()

  it('reports the compulsory first-semester subject and a missing major', () => {
    const plan: Plan = {
      course: 'EX-SCI',
      courseYear: 2026,
      completed: [],
      terms: [
        { year: 2026, period: 'semester-1', subjects: ['EXCS10001'] },
        { year: 2026, period: 'semester-2', subjects: ['EXSC10001'] },
      ],
    }
    const { statuses } = checkCourse(plan, data)
    const byId = Object.fromEntries(statuses.map((s) => [s.ruleId, s]))
    expect(byId.exsc10001?.status).toBe('fail')
    expect(byId.exsc10001?.detail).toMatch(/first semester/)
    expect(byId.major?.status).toBe('fail')
    expect(byId.total?.status).toBe('fail')
    expect(byId['level1-cap']?.status).toBe('ok')
  })

  it('reports uncurated course rules as a warning, not a pass', () => {
    const { issues } = checkCourse({ course: 'NOPE', courseYear: 2026, completed: [], terms: [] }, data)
    expect(issues).toEqual([expect.objectContaining({ severity: 'warning', kind: 'course-unknown' })])
  })
})
