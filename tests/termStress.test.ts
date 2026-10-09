import { describe, expect, it } from 'vitest'
import { planStress, requiredWithPrerequisites, termStress } from '../src/engine/termStress'
import { relieveTerm } from '../src/engine/relieve'
import { planRoles } from '../src/engine/roles'
import type { Plan } from '../src/engine/plan'
import type { Profile } from '../src/engine/recommend'
import { buildDataset } from '../scripts/dataset'
import { dataset, subject } from './helpers'

const profile = (p: Partial<Profile> = {}): Profile => ({ results: [], skills: {}, interests: [], goal: 'balanced', ...p })
const tasks = (exam: number) => [
  { kind: 'exam', weight: exam },
  { kind: 'assignment', weight: 100 - exam },
]
const plain = (code: string, extra: Record<string, unknown> = {}) =>
  subject({ code, prerequisites: 'none', assessment: tasks(50), weekly_contact_hours: 3.5, ...extra })

describe('termStress', () => {
  const data = dataset([plain('MAST10006'), plain('MAST10007'), plain('MAST10005'), plain('BIOL10008'), plain('HIST10001')])
  const calcAndAlgebra = ['MAST10006', 'MAST10007', 'BIOL10008', 'HIST10001']

  it('two maths subjects for someone who rated maths weak is a heavy term, and says which', () => {
    const s = termStress(calcAndAlgebra, data, profile({ skills: { maths: 2 } }))
    expect(s.level).toBe('heavy')
    expect(s.reasons).toEqual([{ key: 'stackWeak', params: { skill: 'maths', codes: 'MAST10006, MAST10007', n: 2 } }])
  })

  it('three subjects on a weak skill is very heavy', () => {
    expect(termStress(['MAST10005', 'MAST10006', 'MAST10007', 'BIOL10008'], data, profile({ skills: { maths: 1 } })).level).toBe('veryHeavy')
  })

  it('the same subjects for someone strong at maths, or someone we know nothing about, raise nothing', () => {
    expect(termStress(calcAndAlgebra, data, profile({ skills: { maths: 5 } }))).toMatchObject({ level: 'ok', reasons: [] })
    // Three maths subjects is the point of a maths major; without a weak spot it's no warning.
    expect(termStress(['MAST10005', 'MAST10006', 'MAST10007', 'BIOL10008'], data)).toMatchObject({ level: 'ok', reasons: [] })
  })

  it('without a self-rating, low past maths marks count as a weakness — one middling mark doesn\'t', () => {
    const withMarks = (...marks: number[]) =>
      profile({ results: marks.map((mark, i) => ({ code: ['MAST10005', 'MAST10009'][i] as string, mark })) })
    const twoData = dataset([...Object.values(data.subjects), plain('MAST10009')])
    const s = termStress(calcAndAlgebra, twoData, withMarks(58, 62))
    expect(s.level).toBe('heavy')
    expect(s.reasons[0]).toMatchObject({ key: 'stackMarks', params: { mark: 60 } })
    expect(termStress(calcAndAlgebra, twoData, withMarks(58)).level).toBe('ok')
    expect(termStress(calcAndAlgebra, twoData, withMarks(50)).reasons[0]).toMatchObject({ key: 'stackMarks', params: { mark: 50 } })
  })

  const four = ['AAAA10001', 'AAAA10002', 'AAAA10003', 'AAAA10004']
  const term = (extra: (i: number) => Record<string, unknown>) => dataset(four.map((code, i) => plain(code, extra(i))))

  it('three subjects decided by the final is an exam crunch; mostly-60% finals are normal', () => {
    const s = termStress(four, term((i) => ({ assessment: tasks(i < 3 ? 75 : 45) })))
    expect(s).toMatchObject({ level: 'heavy', reasons: [{ key: 'exams', params: { n: 3, codes: 'AAAA10001, AAAA10002, AAAA10003' } }] })
    expect(termStress(four, term(() => ({ assessment: tasks(60) }))).level).toBe('ok')
  })

  it('three subjects marked on coursework keep you busy all semester, whatever the exams', () => {
    const s = termStress(four, term((i) => ({ assessment: tasks(i < 3 ? 30 : 70) })))
    expect(s).toMatchObject({ level: 'heavy', reasons: [{ key: 'coursework', params: { n: 3 } }] })
  })

  it('three coding subjects with big projects pile up', () => {
    const coding = term((i) => ({ area: 'COMP', assessment: [{ kind: 'project', weight: i < 3 ? 40 : 10 }, { kind: 'exam', weight: i < 3 ? 60 : 90 }] }))
    expect(termStress(four, coding).reasons.map((r) => r.key)).toEqual(['projects'])
  })

  it('20+ class hours a week is busy weeks; two rules at once is very heavy', () => {
    expect(termStress(four, term(() => ({ weekly_contact_hours: 5.5 }))).reasons.map((r) => r.key)).toEqual(['hours'])
    expect(termStress(four, term(() => ({ weekly_contact_hours: 5.5, assessment: tasks(80) }))).level).toBe('veryHeavy')
    // A couple of lab subjects (16–19 hours) is an ordinary science semester.
    expect(termStress(four, term((i) => ({ weekly_contact_hours: i < 2 ? 6 : 3 }))).level).toBe('ok')
  })

  it('without our own ratings, uses what the review summary says', () => {
    const summary = (workload: string, difficulty: string) => ({
      code: 'AAAA10001', source: 'StudentVIP', url: 'https://studentvip.com.au/unimelb/subjects/aaaa10001', reviews: 5, from: 2024, to: 2025, checked: '2026-10-09',
      points: [{ en: 'A summary point long enough.', zh: '一条摘要要点' }], workload, difficulty,
    })
    const d = term(() => ({}))
    for (const c of four.slice(0, 2)) (d.subjects[c] as { discussion?: unknown }).discussion = summary('heavy', 'hard')
    expect(termStress(four, d).reasons.map((r) => r.key).sort()).toEqual(['hard', 'workload'])
  })

  it('student ratings count only from three reviews, and not for someone strong at what it uses', () => {
    const rated = (reviews: number) => term(() => ({ area: 'MAST', signals: { reviews, difficulty: 4.5 } }))
    expect(termStress(four, rated(5)).reasons.map((r) => r.key)).toEqual(['hard'])
    expect(termStress(four, rated(2)).level).toBe('ok')
    expect(termStress(four, rated(5), profile({ skills: { maths: 5 } })).level).toBe('ok')
  })

  it('stays quiet for a part-time semester', () => {
    expect(termStress(['MAST10006', 'MAST10007'], data, profile({ skills: { maths: 1 } })).level).toBe('ok')
  })
})

describe('planStress', () => {
  const maths = ['MAST10005', 'MAST10006', 'MAST10007', 'MAST10008', 'MAST10009']
  const data = dataset([...maths.map((c) => plain(c)), ...['BIOL1', 'BIOL2', 'BIOL3', 'BIOL4'].map((c) => plain(`${c}0001`))])
  const weak = profile({ skills: { maths: 2 } })

  it('when every semester has to carry two maths subjects, says so once instead of on each semester', () => {
    const terms = [
      ['MAST10005', 'MAST10006', 'BIOL10001', 'BIOL20001'],
      ['MAST10007', 'MAST10008', 'BIOL30001', 'BIOL40001'],
    ]
    const s = planStress(terms, data, weak)
    expect(s.unavoidable).toEqual([{ skill: 'maths', total: 4, perTerm: 2 }])
    expect(s.terms.map((t) => t.level)).toEqual(['ok', 'ok'])
  })

  it('still flags a semester that has more than its share', () => {
    const terms = [
      ['MAST10005', 'MAST10006', 'MAST10007', 'BIOL10001'],
      ['MAST10008', 'BIOL20001', 'BIOL30001', 'BIOL40001'],
    ]
    const s = planStress(terms, data, weak)
    expect(s.unavoidable).toEqual([{ skill: 'maths', total: 4, perTerm: 2 }])
    expect(s.terms.map((t) => t.level)).toEqual(['veryHeavy', 'ok'])
  })
})

describe('relieveTerm', () => {
  const weak = profile({ skills: { maths: 2 } })
  const planOf = (terms: Plan['terms']): Plan => ({ course: 'NONE', courseYear: 2026, completed: [], terms })
  const both = { offerings: { 2027: ['semester-1', 'semester-2'] } }

  it('swaps a subject with the next semester when that splits the pair', () => {
    const data = dataset([
      plain('MAST10006', both),
      plain('MAST10007', both),
      ...['BIOL10001', 'BIOL10002', 'BIOL10003', 'BIOL10004', 'BIOL10005', 'BIOL10006'].map((c) => plain(c, both)),
    ])
    const plan = planOf([
      { year: 2027, period: 'semester-1', subjects: ['MAST10006', 'MAST10007', 'BIOL10001', 'BIOL10002'] },
      { year: 2027, period: 'semester-2', subjects: ['BIOL10003', 'BIOL10004', 'BIOL10005', 'BIOL10006'] },
    ])
    const r = relieveTerm(plan, data, 0, weak)
    expect(r?.kind).toBe('spread')
    const s1 = r?.kind === 'spread' ? (r.terms[0]?.subjects ?? []) : []
    expect(s1.filter((c) => c.startsWith('MAST'))).toHaveLength(1)
    // The plan passed in is left alone.
    expect(plan.terms[0]?.subjects).toEqual(['MAST10006', 'MAST10007', 'BIOL10001', 'BIOL10002'])
  })

  it('offers the winter term when nothing can swap, but never a term before the plan starts', () => {
    const s1Only = { offerings: { 2027: ['semester-1'] } }
    const s2Only = { offerings: { 2027: ['semester-2'] } }
    const subjects = (m7: Record<string, unknown>) =>
      dataset([
        plain('MAST10006', s1Only),
        plain('MAST10007', m7),
        plain('BIOL10001', s1Only),
        plain('BIOL10002', s1Only),
        ...['BIOL20001', 'BIOL20002', 'BIOL20003', 'BIOL20004'].map((c) => plain(c, s2Only)),
      ])
    const plan = planOf([
      { year: 2027, period: 'semester-1', subjects: ['MAST10006', 'MAST10007', 'BIOL10001', 'BIOL10002'] },
      { year: 2027, period: 'semester-2', subjects: ['BIOL20001', 'BIOL20002', 'BIOL20003', 'BIOL20004'] },
    ])
    expect(relieveTerm(plan, subjects({ offerings: { 2027: ['semester-1', 'winter'] } }), 0, weak)).toEqual({
      kind: 'shortTerm',
      code: 'MAST10007',
      year: 2027,
      period: 'winter',
    })
    expect(relieveTerm(plan, subjects({ offerings: { 2027: ['summer', 'semester-1'] } }), 0, weak)).toBeNull()
  })

  it('has nothing to offer for a semester that is fine', () => {
    const data = dataset(['A', 'B', 'C', 'D'].map((x) => plain(`${x}AAA10001`)))
    const plan = planOf([{ year: 2027, period: 'semester-1', subjects: ['AAAA10001', 'BAAA10001', 'CAAA10001', 'DAAA10001'] }])
    expect(relieveTerm(plan, data, 0, weak)).toBeNull()
  })
})

describe('plan builder spreads the load (real data)', () => {
  it('keeps heavy semesters rare across every major, also for a student weak at maths', async () => {
    const { generatePlan } = await import('../src/engine/generate')
    const { dataset: real } = buildDataset('real')
    const share = (p: Profile) => {
      let terms = 0
      let heavy = 0
      const fixable: string[] = []
      for (const m of real.components.filter((c) => c.kind === 'major')) {
        const { plan } = generatePlan({ data: real, profile: p, course: 'B-SCI', courseYear: 2026, major: m.id, startYear: 2027, startPeriod: 'semester-1' })
        const roles = planRoles(real, 'B-SCI', 2026, [m.id])
        const planned = plan.terms.flatMap((t) => t.subjects)
        const fixed = requiredWithPrerequisites(new Set([...roles.required, ...roles.options]), planned, real.subjects, 'B-SCI')
        const s = planStress(plan.terms.map((t) => t.subjects), real, p, fixed)
        plan.terms.forEach((t, i) => {
          if (t.subjects.length < 3) return
          terms++
          if (s.terms[i]?.level === 'ok') return
          heavy++
          // Whatever the builder leaves heavy must be past fixing by a swap or another elective.
          const r = relieveTerm(plan, real, i, p)
          if (r && r.kind !== 'shortTerm') fixable.push(`${m.id} ${t.year} ${t.period}: ${r.kind}`)
        })
      }
      expect(fixable).toEqual([])
      return heavy / terms
    }
    // Review summaries now flag real heavy subjects too, so a few more semesters carry a note.
    expect(share(profile())).toBeLessThan(0.08)
    // Weak at maths, many science majors can't avoid two maths subjects somewhere (and the
    // data has only maths-based level-2 breadth so far; physics and the engineering-systems
    // majors now carry their real maths prerequisites too): flagged, but never left fixable.
    expect(share(profile({ skills: { maths: 2 } }))).toBeLessThan(0.3)
    // Builds a plan for every major, twice, which is slow on CI runners.
  }, 120_000)
})

describe('relieveTerm picks a swap for the semester in question', () => {
  it('lightens this semester even when the whole-plan balance would rather change another', () => {
    const both = { offerings: { 2027: ['semester-1', 'semester-2'] } }
    const code = (i: number) => ({ area: 'COMP', assessment: [{ kind: 'project', weight: 40 }, { kind: 'exam', weight: 60 }], ...both, code: `COMP2000${i}` })
    const data = dataset([
      ...[1, 2, 3].map((i) => subject({ prerequisites: 'none', weekly_contact_hours: 3, ...code(i) })),
      ...['BIOL10001', 'BIOL10002', 'BIOL10003', 'BIOL10004', 'BIOL10005'].map((c) => plain(c, both)),
    ])
    const plan: Plan = {
      course: 'NONE',
      courseYear: 2026,
      completed: [],
      terms: [
        { year: 2027, period: 'semester-1', subjects: ['COMP20001', 'COMP20002', 'COMP20003', 'BIOL10001'] },
        { year: 2027, period: 'semester-2', subjects: ['BIOL10002', 'BIOL10003', 'BIOL10004', 'BIOL10005'] },
      ],
    }
    const r = relieveTerm(plan, data, 0)
    expect(r).toMatchObject({ kind: 'spread', swaps: [expect.objectContaining({})] })
    const s1 = r?.kind === 'spread' ? (r.terms[0]?.subjects ?? []) : []
    expect(s1.filter((c) => c.startsWith('COMP'))).toHaveLength(2)
  })
})

describe('relieveTerm offers a different elective', () => {
  it('replaces the elective that makes the semester heavy with one that counts the same way', () => {
    const s1 = { offerings: { 2027: ['semester-1'] } }
    const breadth = { categories: { NONE: 'breadth' }, ...s1 }
    const hard = { signals: { reviews: 5, difficulty: 4.5 } }
    const data = dataset([
      plain('MAST10006', { ...s1, ...hard }),
      plain('ECON10003', { ...breadth, ...hard }),
      plain('MKTG10001', breadth),
      plain('BIOL10001', s1),
      plain('BIOL10002', s1),
    ])
    const plan: Plan = { course: 'NONE', courseYear: 2026, completed: [], terms: [{ year: 2027, period: 'semester-1', subjects: ['MAST10006', 'ECON10003', 'BIOL10001', 'BIOL10002'] }] }
    expect(relieveTerm(plan, data, 0)).toMatchObject({ kind: 'replace', code: 'ECON10003', with: 'MKTG10001' })
  })
})

describe('lightening a semester keeps what later subjects lean on (real data)', () => {
  const { dataset: real } = buildDataset('real')
  // Weak at maths, the heavy-semester fix used to drop MAST10006/MAST10007 for an easier
  // elective, though BMEN20003 and COMP20003 ("25 points of MAST") need them.
  it.each([
    ['bioengineering-systems', undefined],
    ['immunology', 'artificial-intelligence'],
    ['pathology', 'artificial-intelligence'],
  ])('%s + %s places every subject it needs', async (major, specialisation) => {
    const { generatePlan } = await import('../src/engine/generate')
    const { unplaced } = generatePlan({
      data: real,
      profile: profile({ skills: { maths: 2 }, goal: 'wam' }),
      course: 'B-SCI',
      courseYear: 2026,
      major,
      specialisation,
      startYear: 2027,
      startPeriod: 'semester-1',
    })
    expect(unplaced.map((u) => u.code)).toEqual([])
  })
})
