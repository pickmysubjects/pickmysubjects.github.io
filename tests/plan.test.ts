import { describe, expect, it } from 'vitest'
import { offeredIn } from '../src/engine/availability'
import { checkCourse } from '../src/engine/courseRules'
import type { Plan } from '../src/engine/plan'
import { planStart, standardTerms } from '../src/engine/plan'
import { checkTerms, previewAdd } from '../src/engine/planCheck'
import { buildDataset } from '../scripts/dataset'
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

describe('checkCourse (one subject fills one requirement)', () => {
  const { dataset: real } = buildDataset('real')
  const status = (codes: string[]) => {
    const plan: Plan = {
      course: 'B-SCI',
      courseYear: 2026,
      major: 'mathematics-and-statistics-operations-research',
      completed: codes,
      terms: [],
    }
    return checkCourse(plan, real).statuses.find((s) => s.ruleId === 'major')?.status
  }

  it("doesn't let MAST30021 count for both 'one of 30021/30022' and the fourth subject", () => {
    expect(status(['MAST30012', 'MAST30013', 'MAST30021'])).toBe('fail')
    expect(status(['MAST30012', 'MAST30013', 'MAST30021', 'MAST30022'])).toBe('ok')
    expect(status(['MAST30012', 'MAST30013', 'MAST30022', 'MAST30011'])).toBe('ok')
  })
})

describe('planStart', () => {
  it('starts at the next semester that has not begun when study started earlier', () => {
    const oct2026 = new Date(2026, 9, 7)
    expect(planStart({ year: 2025, period: 'semester-2' }, oct2026)).toEqual({ year: 2027, period: 'semester-1' })
    expect(planStart({ year: 2026, period: 'semester-2' }, new Date(2026, 4, 1))).toEqual({ year: 2026, period: 'semester-2' })
    expect(planStart({ year: 2026, period: 'semester-1' }, new Date(2026, 4, 1))).toEqual({ year: 2026, period: 'semester-2' })
    expect(planStart({ year: 2028, period: 'semester-1' }, oct2026)).toEqual({ year: 2028, period: 'semester-1' }) // future start is kept
  })
})

describe('checkTerms (non-allowed listed on one side only)', () => {
  it('flags a planned subject that a completed subject lists as non-allowed', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none', non_allowed: ['AAAA10002'], offerings: { 2026: ['semester-1'] } }),
      subject({ code: 'AAAA10002', prerequisites: 'none', offerings: { 2026: ['semester-1'] } }), // its own list isn't curated
    ])
    const plan: Plan = { course: 'X', courseYear: 2026, completed: ['AAAA10001'], terms: [{ year: 2026, period: 'semester-1', subjects: ['AAAA10002'] }] }
    expect(checkTerms(plan, data).filter((i) => i.kind === 'non-allowed')).toHaveLength(1)
  })
})

describe('checkCourse (unknowns near a cap)', () => {
  const { dataset: real } = buildDataset('real')
  const status = (completed: string[], ruleId: string) =>
    checkCourse({ course: 'B-SCI', courseYear: 2026, major: 'data-science', completed, terms: [] }, real).statuses.find((s) => s.ruleId === ruleId)?.status

  it('says unknown, not ok, when subjects we know nothing about could break a cap', () => {
    const ten = ['MAST10005', 'MAST10006', 'MAST10007', 'COMP10001', 'COMP10002', 'BIOL10008', 'BIOL10001', 'BIOL10010', 'CHEM10003', 'PHYC10003']
    expect(status(ten, 'level1-cap')).toBe('ok')
    expect(status([...ten, 'COMP10003'], 'level1-cap')).toBe('unknown') // COMP10003 isn't in the data
  })

  it('says unknown, not fail, when an uncurated subject could be the missing level-1 area', () => {
    expect(status(['MAST10006', 'MAST10007'], 'level1-areas')).toBe('fail')
    expect(status(['MAST10006', 'MAST10007', 'COMP10003'], 'level1-areas')).toBe('unknown')
  })
})

describe('checkTerms (summer and winter load)', () => {
  it('treats more than 25 points in a summer term as an overload', () => {
    const subjects = ['AAAA10001', 'AAAA10002', 'AAAA10003'].map((code) => subject({ code, prerequisites: 'none', offerings: { 2027: ['summer'] } }))
    const plan: Plan = { course: 'X', courseYear: 2026, completed: [], terms: [{ year: 2027, period: 'summer', subjects: subjects.map((s) => s.code) }] }
    const over = checkTerms(plan, dataset(subjects)).filter((i) => i.kind === 'overload')
    expect(over.map((i) => i.params.max)).toEqual([25])
  })
})

describe('checkTerms (student visa load)', () => {
  const subjects = ['AAAA10001', 'AAAA10002', 'AAAA10003', 'AAAA10004', 'AAAA10005'].map((code) =>
    subject({ code, prerequisites: 'none', offerings: { 2027: ['summer', 'semester-1', 'semester-2'] } }),
  )
  const data = dataset(subjects)
  const plan = (international: boolean, terms: Plan['terms']): Plan => ({ course: 'X', courseYear: 2026, completed: [], terms, international })

  it('warns when a half-year (summer + semester 1) is under 50 points, but not in the final half-year or for local students', () => {
    const terms: Plan['terms'] = [
      { year: 2027, period: 'semester-1', subjects: ['AAAA10001', 'AAAA10002'] }, // 25: under
      { year: 2027, period: 'semester-2', subjects: ['AAAA10003'] }, // final half-year: fine
    ]
    expect(checkTerms(plan(true, terms), data).filter((i) => i.kind.startsWith('visa-')).map((i) => i.kind)).toEqual(['visa-underload-h1'])
    expect(checkTerms(plan(false, terms), data).filter((i) => i.kind.startsWith('visa-'))).toEqual([])
  })

  it('counts summer towards January–June', () => {
    const terms: Plan['terms'] = [
      { year: 2027, period: 'summer', subjects: ['AAAA10001', 'AAAA10002'] },
      { year: 2027, period: 'semester-1', subjects: ['AAAA10003', 'AAAA10004'] }, // 25 + 25 summer = 50
      { year: 2027, period: 'semester-2', subjects: ['AAAA10005'] },
    ]
    expect(checkTerms(plan(true, terms), data).filter((i) => i.kind.startsWith('visa-'))).toEqual([])
  })
})

describe('previewAdd', () => {
  const data = dataset([
    subject({ code: 'AAAA10001', offerings: { 2026: ['semester-1', 'semester-2'] }, prerequisites: 'none', non_allowed: [] }),
    subject({ code: 'AAAA20001', level: 2, offerings: { 2026: ['semester-2'] }, prerequisites: 'AAAA10001', non_allowed: [] }),
    subject({ code: 'BBBB10001', offerings: { 2026: ['semester-1', 'semester-2'] }, prerequisites: 'none', non_allowed: ['AAAA10001'] }),
  ])
  const plan: Plan = {
    course: 'X',
    courseYear: 2026,
    completed: [],
    terms: [
      { year: 2026, period: 'semester-1', subjects: ['AAAA10001'] },
      { year: 2026, period: 'semester-2', subjects: [] },
    ],
  }
  const kinds = (termIndex: number, code: string) => previewAdd(plan, data, termIndex, code).map((i) => i.kind)

  it('says nothing when it fits', () => {
    expect(kinds(1, 'AAAA20001')).toEqual([])
  })

  it('flags a missing prerequisite and a term it does not run in', () => {
    expect(kinds(0, 'AAAA20001').sort()).toEqual(['not-offered', 'prereq-unmet'])
  })

  it('flags a clash with a subject already planned, either way round', () => {
    expect(kinds(1, 'BBBB10001')).toEqual(['non-allowed'])
  })

  it('ignores a subject already in that term', () => {
    expect(kinds(0, 'AAAA10001')).toEqual([])
  })
})

describe('confirmed prerequisites', () => {
  const data = dataset([
    subject({ code: 'AAAA10001', offerings: { 2026: ['semester-1'] }, prerequisites: { manual: 'VCE Maths study score 25+' }, non_allowed: [] }),
  ])
  const plan: Plan = { course: 'X', courseYear: 2026, completed: [], terms: [{ year: 2026, period: 'semester-1', subjects: ['AAAA10001'] }] }

  it('warns when a condition can only be checked by hand', () => {
    expect(checkTerms(plan, data).map((i) => i.kind)).toContain('prereq-unknown')
  })

  it('stops warning once the student says they meet it', () => {
    expect(checkTerms({ ...plan, confirmed: ['AAAA10001'] }, data).map((i) => i.kind)).not.toContain('prereq-unknown')
  })
})
