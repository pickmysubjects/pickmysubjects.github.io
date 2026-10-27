import { describe, expect, it } from 'vitest'
import { offeredIn } from '../src/engine/availability'
import { checkCourse } from '../src/engine/courseRules'
import type { Plan } from '../src/engine/plan'
import { planStart, standardTerms } from '../src/engine/plan'
import { checkTerms, previewAdd } from '../src/engine/planCheck'
import { realData } from './realData'
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

  it('reports the compulsory first-semester subject, and a missing major as not yet checkable', () => {
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
    // Not having chosen a major yet is normal; the rule waits rather than fails.
    expect(byId.major?.status).toBe('unknown')
    expect(byId.total?.status).toBe('fail')
    expect(byId['level1-cap']?.status).toBe('ok')
  })

  it('reports uncurated course rules as a warning, not a pass', () => {
    const { issues } = checkCourse({ course: 'NOPE', courseYear: 2026, completed: [], terms: [] }, data)
    expect(issues).toEqual([expect.objectContaining({ severity: 'warning', kind: 'course-unknown' })])
  })
})

describe('checkCourse (one subject fills one requirement)', () => {
  const real = realData()
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
  it('starts at the start of study when nothing dated is on the record', () => {
    expect(planStart({ year: 2023, period: 'semester-1' }, [])).toEqual({ year: 2023, period: 'semester-1' })
    expect(planStart({ year: 2023, period: 'semester-1' }, [{ code: 'X' } as never])).toEqual({ year: 2023, period: 'semester-1' })
  })

  it('carries on after the latest semester on the record', () => {
    const done = [{ year: 2023, period: 'semester-1' as const }, { year: 2024, period: 'semester-2' as const }]
    expect(planStart({ year: 2023, period: 'semester-1' }, done)).toEqual({ year: 2025, period: 'semester-1' })
    expect(planStart({ year: 2023, period: 'semester-1' }, [{ year: 2024, period: 'winter' }])).toEqual({ year: 2024, period: 'semester-2' })
  })

  it('carries on in a semester on the record that is not full yet', () => {
    const fill = { pointsOf: () => 12.5, load: 50 }
    const done = [{ code: 'A', year: 2026, period: 'semester-1' as const }, { code: 'B', year: 2026, period: 'semester-2' as const }]
    expect(planStart({ year: 2026, period: 'semester-1' }, done, fill)).toEqual({ year: 2026, period: 'semester-2' })
    const full = ['A', 'B', 'C', 'D'].map((code) => ({ code, year: 2026, period: 'semester-2' as const }))
    expect(planStart({ year: 2026, period: 'semester-1' }, full, fill)).toEqual({ year: 2027, period: 'semester-1' })
  })

  it('keeps a start of study later than the record', () => {
    expect(planStart({ year: 2028, period: 'semester-1' }, [{ year: 2024, period: 'semester-1' }])).toEqual({ year: 2028, period: 'semester-1' })
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
  const real = realData()
  const status = (completed: string[], ruleId: string) =>
    checkCourse({ course: 'B-SCI', courseYear: 2026, major: 'data-science', completed, terms: [] }, real).statuses.find((s) => s.ruleId === ruleId)?.status

  it('says unknown, not ok, when subjects we know nothing about could break a cap', () => {
    const ten = ['MAST10005', 'MAST10006', 'MAST10007', 'COMP10001', 'COMP10002', 'BIOL10008', 'BIOL10001', 'BIOL10010', 'CHEM10003', 'PHYC10003']
    expect(status(ten, 'level1-cap')).toBe('ok')
    expect(status([...ten, 'ZZZZ10001'], 'level1-cap')).toBe('unknown') // ZZZZ10001 isn't in the data
  })

  it('says unknown, not fail, when an uncurated subject could be the missing level-1 area', () => {
    expect(status(['MAST10006', 'MAST10007'], 'level1-areas')).toBe('fail')
    expect(status(['MAST10006', 'MAST10007', 'ZZZZ10001'], 'level1-areas')).toBe('unknown')
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

  it('counts subjects already on the record in that semester, a fail included', () => {
    const terms: Plan['terms'] = [
      { year: 2027, period: 'semester-1', subjects: ['AAAA10001', 'AAAA10002', 'AAAA10003'] }, // 37.5 + 12.5 recorded
      { year: 2027, period: 'semester-2', subjects: ['AAAA10004'] },
    ]
    const withRecord = { ...plan(true, terms), recordedLoad: { '2027|semester-1': 12.5 } }
    expect(checkTerms(withRecord, data).filter((i) => i.kind.startsWith('visa-'))).toEqual([])
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

  it('a swap in a term already over the load is not flagged for it', () => {
    const many = dataset([
      ...['AAAA10001', 'AAAA10002', 'AAAA10003', 'AAAA10004', 'AAAA10005', 'BBBB10001'].map((code) => subject({ code, offerings: { 2026: ['semester-1'] }, prerequisites: 'none', non_allowed: [] })),
    ])
    const heavy: Plan = { course: 'X', courseYear: 2026, completed: [], terms: [{ year: 2026, period: 'semester-1', subjects: ['AAAA10001', 'AAAA10002', 'AAAA10003', 'AAAA10004', 'AAAA10005'] }] }
    // Swapping one 12.5-point subject for another keeps the load where it was.
    expect(previewAdd(heavy, many, 0, 'BBBB10001', 50, 'AAAA10005').map((i) => i.kind)).toEqual([])
    // The old way (judged against the term with the old subject gone) flagged every candidate.
    const without: Plan = { ...heavy, terms: [{ ...heavy.terms[0]!, subjects: heavy.terms[0]!.subjects.slice(0, 4) }] }
    expect(previewAdd(without, many, 0, 'BBBB10001').map((i) => i.kind)).toEqual(['overload'])
    // A term at the load: swapping is fine, adding a fifth one is an overload.
    const full: Plan = { ...heavy, terms: [{ ...heavy.terms[0]!, subjects: ['AAAA10001', 'AAAA10002', 'AAAA10003', 'AAAA10004'] }] }
    expect(previewAdd(full, many, 0, 'BBBB10001', 50, 'AAAA10004').map((i) => i.kind)).toEqual([])
    expect(previewAdd(full, many, 0, 'BBBB10001').map((i) => i.kind)).toEqual(['overload'])
  })
})

describe('prerequisites left to "or equivalent"', () => {
  const data = dataset([
    subject({ code: 'AAAA10001', offerings: { 2026: ['semester-1'] }, prerequisites: 'none', non_allowed: [] }),
    subject({ code: 'AAAA20001', offerings: { 2026: ['semester-2'] }, prerequisites: 'none', non_allowed: [] }),
    subject({
      code: 'AAAA30001',
      offerings: { 2026: ['semester-2'] },
      prerequisites: { any: [{ all: ['AAAA10001', 'AAAA20001'] }, { manual: 'Equivalent' }] },
      non_allowed: [],
    }),
  ])
  const plan: Plan = {
    course: 'X',
    courseYear: 2026,
    completed: [],
    terms: [
      { year: 2026, period: 'semester-1', subjects: ['AAAA10001'] },
      { year: 2026, period: 'semester-2', subjects: ['AAAA30001'] },
    ],
  }

  it('names the listed subject still missing before it', () => {
    const issue = checkTerms(plan, data).find((i) => i.kind === 'prereq-unknown')
    expect(issue?.params.missing).toBe('AAAA20001')
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


describe('discontinued subjects', () => {
  const old = subject({ code: 'AAAA20001', prerequisites: 'none', offerings: { 2026: ['semester-1', 'semester-2'] }, discontinued_from: 2027, replaced_by: ['AAAA20002'] })
  const gone = subject({ code: 'AAAA20003', prerequisites: 'none', offerings: { 2026: ['semester-1'] }, discontinued_from: 2027 })
  const data = dataset([old, gone, subject({ code: 'AAAA20002', prerequisites: 'none', offerings: { 2027: ['semester-1'] } })])

  it('is not offered from the year it stops, even though older timetables would carry over', () => {
    expect(offeredIn(old, 2026, 'semester-1').status).toBe('ok')
    expect(offeredIn(old, 2027, 'semester-1').status).toBe('fail')
    expect(offeredIn(old, 2030, 'semester-2').status).toBe('fail')
  })

  it('a plan that still has it says so, and names the replacement', () => {
    const plan: Plan = { course: 'X', courseYear: 2026, completed: [], terms: [{ year: 2027, period: 'semester-1', subjects: ['AAAA20001', 'AAAA20003'] }] }
    const issues = checkTerms(plan, data)
    const d = issues.filter((i) => i.kind === 'discontinued')
    expect(d.map((i) => [i.subject, i.params.instead])).toEqual([['AAAA20001', 'AAAA20002'], ['AAAA20003', '']])
    expect(d.every((i) => i.severity === 'error')).toBe(true)
    // One clear message per subject, not a second "not offered" on top.
    expect(issues.filter((i) => i.kind === 'not-offered')).toHaveLength(0)
  })

  it('is fine in a year before it stops, and in what a student already passed', () => {
    const plan: Plan = { course: 'X', courseYear: 2026, completed: ['AAAA20003'], terms: [{ year: 2026, period: 'semester-2', subjects: ['AAAA20001'] }] }
    expect(checkTerms(plan, data).filter((i) => i.severity === 'error')).toEqual([])
  })
})

describe('a subject taught at a far campus', () => {
  const data = realData()
  // Ones open to B-SCI students and still running (a closed one is an error already).
  const closed = new Set(data.courses.find((c) => c.code === 'B-SCI')?.closed ?? [])
  const far = Object.values(data.subjects).filter((s) => s.campus && !closed.has(s.code) && s.discontinuedFrom === undefined).map((s) => s.code)
  const plan = (major: string | undefined, course: string, code: string): Plan => ({ course, courseYear: 2026, major, completed: [], terms: [{ year: 2027, period: 'semester-1', subjects: [code] }] })
  it('is flagged when added by hand, naming the campus', () => {
    expect(far.length).toBeGreaterThan(0)
    for (const code of far) {
      const issue = checkTerms(plan('computing-and-software-systems', 'B-SCI', code), data).find((i) => i.kind === 'far-campus')
      expect(issue, code).toMatchObject({ severity: 'warning', subject: code, params: { code, campus: data.subjects[code]!.campus } })
    }
    // The add preview says it too, before the subject is added.
    const empty: Plan = { course: 'B-SCI', courseYear: 2026, major: 'computing-and-software-systems', completed: [], terms: [{ year: 2027, period: 'semester-1', subjects: [] }] }
    expect(previewAdd(empty, data, 0, far[0]!).map((i) => i.kind)).toContain('far-campus')
  })
  it('is not flagged when the student’s own major needs it', () => {
    // Agricultural Science (B-SCI) names AGRI30016, taught at Dookie.
    expect(data.subjects.AGRI30016?.campus).toBeTruthy()
    expect(checkTerms(plan('agricultural-science', 'B-SCI', 'AGRI30016'), data).some((i) => i.kind === 'far-campus')).toBe(false)
  })
  it('leaves Parkville subjects alone', () => {
    for (const p of [plan('computing-and-software-systems', 'B-SCI', 'COMP10001'), plan('finance', 'B-COM', 'FNCE10002')]) {
      expect(checkTerms(p, data).some((i) => i.kind === 'far-campus')).toBe(false)
    }
  })
})
