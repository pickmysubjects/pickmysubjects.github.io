import { describe, expect, it } from 'vitest'
import { checkCourse } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import type { Profile } from '../src/engine/recommend'
import { realData } from './realData'
import { demo } from './helpers'

const data = demo()
const profile: Profile = {
  results: [],
  skills: { programming: 4, maths: 4, statistics: 3 },
  interests: ['machine-learning', 'ai', 'data-science'],
  goal: 'balanced',
}

function generate(over: Partial<Parameters<typeof generatePlan>[0]> = {}) {
  return generatePlan({
    data,
    profile,
    course: 'EX-SCI',
    courseYear: 2026,
    major: 'ex-data-science',
    startYear: 2026,
    startPeriod: 'semester-1',
    ...over,
  })
}

/**
 * Majors whose required subjects aren't fully curated yet (no study periods or
 * prerequisites, or not in the data at all), so a whole-degree plan can't be built
 * for them. Remove each one once its subjects are in (subject batches 7-19).
 * Informatics: the Handbook's third core subject, INFO30004, is no longer available.
 * Agri-food Biotechnology: its core subject BTCH30002 is not running in 2026.
 */
const DATA_PENDING = new Set([
  'biotechnology-agrifood',
  'informatics',
])

describe('generatePlan (demo course)', () => {
  it('builds a complete three-year plan with no term errors and every course rule met', () => {
    const { plan, unplaced } = generate()
    expect(unplaced).toEqual([])
    expect(plan.terms).toHaveLength(6)

    const termErrors = checkTerms(plan, data).filter((i) => i.severity === 'error')
    expect(termErrors).toEqual([])

    const { statuses } = checkCourse(plan, data)
    const notOk = statuses.filter((s) => s.status !== 'ok').map((s) => `${s.ruleId}: ${s.detail}`)
    expect(notOk).toEqual([])
  })

  it('puts the compulsory subject in the first semester and respects the load', () => {
    const { plan } = generate()
    expect(plan.terms[0]?.subjects).toContain('EXSC10001')
    for (const t of plan.terms) {
      const pts = t.subjects.reduce((sum, c) => sum + (data.subjects[c]?.points ?? 0), 0)
      expect(pts).toBeLessThanOrEqual(50)
    }
  })

  it('includes the whole major plus the prerequisite chain it needs', () => {
    const { plan } = generate()
    const all = plan.terms.flatMap((t) => t.subjects)
    for (const c of ['EXCS30001', 'EXST30001', 'EXCS20002', 'EXMA10002', 'EXST20001', 'EXST10001']) {
      expect(all).toContain(c)
    }
  })

  it('works for a mid-degree student starting in semester 2', () => {
    const { plan, unplaced } = generate({
      major: 'ex-computing',
      startPeriod: 'semester-2',
      profile: {
        ...profile,
        results: [
          { code: 'EXSC10001', mark: 75 },
          { code: 'EXCS10001', mark: 82 },
          { code: 'EXMA10001', mark: 70 },
          { code: 'EXST10001', mark: 78 },
        ],
      },
    })
    expect(unplaced).toEqual([])
    expect(checkTerms(plan, data).filter((i) => i.severity === 'error')).toEqual([])
    const notOk = checkCourse(plan, data).statuses.filter((s) => s.status !== 'ok').map((s) => s.ruleId)
    expect(notOk).toEqual([])
  })

  it('re-plans a failed subject before the subjects that need it', () => {
    const { plan } = generate({ profile: { ...profile, results: [{ code: 'EXSC10001', mark: 70 }, { code: 'EXCS10001', mark: 40 }] } })
    const termOf = (c: string) => plan.terms.findIndex((t) => t.subjects.includes(c))
    expect(termOf('EXCS10001')).toBeGreaterThanOrEqual(0)
    expect(termOf('EXCS20002')).toBeGreaterThan(termOf('EXCS10001'))
  })

  it('still builds a full plan when prerequisites are not curated yet and the profile is empty', () => {
    const sparse = demo()
    for (const s of Object.values(sparse.subjects)) s.prerequisites = 'unknown'
    const { plan, unplaced } = generatePlan({
      data: sparse,
      profile: { results: [], skills: {}, interests: [], goal: 'balanced' },
      course: 'EX-SCI',
      courseYear: 2026,
      major: 'ex-computing',
      startYear: 2026,
      startPeriod: 'semester-1',
    })
    expect(unplaced).toEqual([])
    const notOk = checkCourse(plan, sparse).statuses.filter((s) => s.status !== 'ok').map((s) => s.ruleId)
    expect(notOk).toEqual([])
  })

  it('explains what it could not do instead of silently dropping requirements', () => {
    const { notes } = generate({ major: 'no-such-major' })
    expect(notes.map((n) => n.text).join(' ')).toMatch(/no-such-major isn't in the dataset/)
  })
})

describe('generatePlan (real B-SCI data, whole degree)', () => {
  const real = realData()
  const majors = real.components.filter(
    (c) => c.course === 'B-SCI' && c.kind === 'major' && c.requirements !== 'unknown' && !DATA_PENDING.has(c.id),
  )
  // Maths streams with a computing specialisation are too tight for the greedy planner today.
  const combos = [
    ...majors.map((m) => [m.id, undefined] as const),
    ...['computing-and-software-systems', 'data-science'].flatMap((m) =>
      ['artificial-intelligence', 'advanced-computing'].map((s) => [m, s] as const),
    ),
  ]

  // Physics (Chemical Physics) uses 20 of 24 slots on its chain; the last breadth chain
  // (level 1 then level 2) needs breadth subjects the dataset doesn't have yet.
  const breadthTooThin = new Set(['physics-chemical'])
  it.each(combos)('%s + %s meets every course rule, including breadth', (major, specialisation) => {
    const { plan, unplaced } = generatePlan({
      data: real,
      profile: { results: [], skills: {}, interests: [], goal: 'balanced' },
      course: 'B-SCI',
      courseYear: 2026,
      major,
      specialisation,
      startYear: 2027,
      startPeriod: 'semester-1',
    })
    expect(unplaced).toEqual([])
    const notOk = checkCourse(plan, real).statuses
      .filter((s) => s.status !== 'ok' && !(breadthTooThin.has(major) && s.ruleId === 'breadth'))
      .map((s) => `${s.ruleId}: ${s.detail}`)
    expect(notOk).toEqual([])
  })
})

describe('generatePlan (repair keeps points prerequisites)', () => {
  it('does not swap out a subject a later "25 points of level 2" prerequisite relies on', () => {
    const real = realData()
    const { plan } = generatePlan({
      data: real,
      profile: {
        results: [
          { code: 'SCIE10005', mark: 70 },
          { code: 'MAST10021', mark: 70 },
          { code: 'COMP10001', mark: 70 },
          { code: 'ACCT10002', mark: 70 },
          { code: 'MAST10009', mark: 70 },
          { code: 'JAPN10002', mark: 40 },
        ],
        skills: {},
        interests: [],
        goal: 'balanced',
      },
      course: 'B-SCI',
      courseYear: 2026,
      major: 'mathematics-and-statistics',
      specialisation: 'advanced-computing',
      startYear: 2028,
      startPeriod: 'semester-2',
    })
    expect(checkTerms(plan, real).filter((i) => i.severity === 'error').map((i) => i.message)).toEqual([])
  })
})

describe('generatePlan with a field but no major yet', () => {
  it('plans the first-year subjects most of the field’s majors need, so they all stay open', async () => {
    const real = realData()
    const biomed = ['biochemistry-and-molecular-biology', 'genetics', 'immunology', 'microbiology', 'pathology', 'pharmacology', 'physiology'].filter((id) =>
      real.components.some((c) => c.id === id),
    )
    const base = { data: real, profile: { results: [], skills: {}, interests: [], goal: 'balanced' as const }, course: 'B-SCI', courseYear: 2026, startYear: 2027, startPeriod: 'semester-1' as const }
    const open = generatePlan({ ...base, keepOpen: biomed })
    const year1 = open.plan.terms.slice(0, 2).flatMap((t) => t.subjects)
    // Biology and chemistry: what nearly every biomedical major starts from.
    expect(year1).toEqual(expect.arrayContaining(['BIOL10008', 'CHEM10003']))
    expect(open.notes.some((n) => n.key === 'keptOpen')).toBe(true)
    // Without a field, nothing is assumed.
    const blank = generatePlan(base)
    expect(blank.notes.some((n) => n.key === 'keptOpen')).toBe(false)
  })
})

describe('generatePlan with summer- or winter-only compulsory subjects', () => {
  it('adds a summer or winter term for them instead of leaving them out', async () => {
    const real = realData()
    // FRST30001 runs February–May (Semester 1), so the forest major no longer needs one.
    for (const major of ['marine-biology']) {
      const { plan, unplaced } = generatePlan({
        data: real,
        profile: { results: [], skills: {}, interests: [], goal: 'balanced' },
        course: 'B-SCI',
        courseYear: 2026,
        major,
        startYear: 2027,
        startPeriod: 'semester-1',
      })
      expect(unplaced.map((u) => u.code), major).toEqual([])
      const short = plan.terms.filter((t) => t.period === 'summer' || t.period === 'winter')
      expect(short.length, major).toBeGreaterThan(0)
      expect(checkTerms(plan, real).filter((i) => i.severity === 'error'), major).toEqual([])
    }
  })
})

describe('generatePlan never takes a graduate route', () => {
  it('plans Informatics the undergraduate way, with nothing from a master’s degree', async () => {
    const real = realData()
    const { plan, unplaced } = generatePlan({
      data: real,
      profile: { results: [], skills: {}, interests: [], goal: 'balanced' },
      course: 'B-SCI',
      courseYear: 2026,
      major: 'informatics',
      startYear: 2027,
      startPeriod: 'semester-1',
    })
    const all = plan.terms.flatMap((t) => t.subjects)
    expect(all.filter((c) => /^[A-Z]{4}9/.test(c))).toEqual([])
    // INFO30005 isn't open to B-SCI students (the major is only for pre-2018 starters): left out,
    // with why, and COMP30022 goes the other way in (SWEN30006).
    expect(unplaced.map((u) => [u.code, u.reasonKey])).toEqual([['INFO30005', 'closedToCourse']])
    expect(all).toEqual(expect.arrayContaining(['COMP30022']))
    expect(all).not.toContain('INFO30005')
  })
})

describe('generatePlan keeps chains to the usual length', () => {
  const real = realData()
  const plan = (major: string, startPeriod: 'semester-1' | 'semester-2') =>
    generatePlan({ data: real, profile: { results: [], skills: {}, interests: [], goal: 'balanced' }, course: 'B-SCI', courseYear: 2026, major, startYear: 2027, startPeriod })
  const semesters = (r: ReturnType<typeof plan>) => r.plan.terms.filter((t) => t.period.startsWith('semester')).length

  it('places a one-way corequisite in the same semester (MIIM30016 with MIIM30011)', () => {
    const r = plan('microbiology', 'semester-1')
    expect(r.unplaced).toEqual([])
    expect(semesters(r)).toBe(6)
    const term = (c: string) => r.plan.terms.findIndex((t) => t.subjects.includes(c))
    expect(term('MIIM30016')).toBe(term('MIIM30011'))
  })

  it('a summer-only subject replaces an elective instead of going past 300 points (marine biology)', () => {
    const r = plan('marine-biology', 'semester-1')
    const points = r.plan.terms.flatMap((t) => t.subjects).reduce((sum, c) => sum + (real.subjects[c]?.points ?? 0), 0)
    expect(r.plan.terms.some((t) => t.subjects.includes('ZOOL30008'))).toBe(true)
    expect(points).toBe(300)
    expect(checkCourse(r.plan, real).statuses.filter((st) => st.status === 'fail')).toEqual([])
  })

  it('uses summer for a chain subject rather than adding a semester (mid-year chemistry)', () => {
    const r = plan('chemistry-chemistry', 'semester-2')
    expect(r.unplaced).toEqual([])
    expect(semesters(r)).toBe(6)
    expect(r.plan.terms.find((t) => t.period === 'summer')?.subjects).toContain('CHEM10004')
    expect(r.notes.some((n) => n.key === 'shortTermChain')).toBe(true)
  })
  it('never plans a far-campus subject (Dookie) that no requirement needs', () => {
    for (const m of real.components.filter((c) => c.course === 'B-SCI' && c.kind === 'major' && c.closedFrom === undefined)) {
      for (const sp of ['semester-1', 'semester-2'] as const) {
        const remote = plan(m.id, sp).plan.terms.flatMap((t) => t.subjects).filter((c) => real.subjects[c]?.campus)
        expect(remote, `${m.id} ${sp}`).toEqual([])
      }
    }
  }, 120_000)
})

describe('one subject short after a fail', () => {
  it('uses a summer or winter term instead of a whole extra semester', async () => {
    const dataset = realData()
    const row = (code: string, year: number, period: 'semester-1' | 'semester-2', mark?: number) => ({ code, year, period, ...(mark === undefined ? {} : { mark }) })
    const results = [
      row('COMP10001', 2023, 'semester-1', 81), row('ECON10004', 2023, 'semester-1', 81), row('MAST10005', 2023, 'semester-1', 81), row('SCIE10005', 2023, 'semester-1'),
      row('COMP10002', 2023, 'semester-2', 81), row('MAST10006', 2023, 'semester-2', 69), row('MAST10007', 2023, 'semester-2', 75), row('MGMT10002', 2023, 'semester-2', 85),
      row('COMP20007', 2024, 'semester-1', 64), row('ECON20002', 2024, 'semester-1', 84), row('INFO20003', 2024, 'semester-1', 74), row('MGMT20002', 2024, 'semester-1', 82),
      row('COMP30020', 2024, 'semester-2', 68), row('MAST20018', 2024, 'semester-2', 71), row('MAST20026', 2024, 'semester-2', 48), row('SWEN20003', 2024, 'semester-2', 75),
    ]
    const profile: Profile = { results, skills: {}, interests: [], goal: 'balanced' }
    const r = generatePlan({ data: dataset, profile, course: 'B-SCI', courseYear: 2026, major: 'computing-and-software-systems', startYear: 2025, startPeriod: 'semester-1' })
    const main = r.plan.terms.filter((t) => t.period === 'semester-1' || t.period === 'semester-2')
    expect(main.at(-1)).toMatchObject({ year: 2025, period: 'semester-2' })
    expect(r.plan.terms.some((t) => (t.period === 'summer' || t.period === 'winter') && t.subjects.length > 0)).toBe(true)
    expect(r.notes.some((n) => typeof n !== 'string' && n.key === 'finishEarlier')).toBe(true)
  })
})

describe('generatePlan (real B-ARTS data, capstones limited to a major)', () => {
  const real = realData()
  const planFor = (major: string) =>
    generatePlan({
      data: real,
      profile: { results: [], skills: {}, interests: ['chinese', 'china', 'asia'], goal: 'balanced' },
      course: 'B-ARTS',
      courseYear: 2026,
      major,
      startYear: 2026,
      startPeriod: 'semester-1',
    }).plan.terms.flatMap((t) => t.subjects)

  it("never gives a History student another major's capstone, which a Chinese Studies plan can hold", () => {
    expect(planFor('history')).not.toContain('CHIN30029')
    expect(planFor('chinese-studies')).toContain('CHIN30029')
  }, 30_000)

  it("flags another major's capstone placed by hand in a History plan", () => {
    const plan = { course: 'B-ARTS', courseYear: 2026, major: 'history', completed: [], terms: [{ year: 2028, period: 'semester-2' as const, subjects: ['CHIN30029'] }] }
    const unmet = (major: string) => checkTerms({ ...plan, major }, real).filter((i) => i.kind === 'prereq-unmet' && i.subject === 'CHIN30029')
    expect(unmet('history').map((i) => i.params.needs)).toEqual(['a place in the Chinese Studies major'])
    expect(unmet('chinese-studies')).toEqual([])
  })
})

describe('generatePlan picks a major’s choice by fit', () => {
  // Every option of Computing's choice needs a subject first; they still have to be scored, or
  // the "best match among its options" is whichever comes first in the list.
  const chose = (interests: string[]) =>
    generate({ major: 'ex-computing', profile: { results: [], skills: {}, interests, goal: 'balanced' } }).notes.filter((n) => n.key === 'chose').map((n) => n.params.code)

  it('takes the option on the student’s own interest, though all of them have prerequisites', () => {
    expect(chose(['systems'])).toEqual(['EXCS30003'])
    expect(chose(['design'])).toEqual(['EXCS30006'])
    expect(['EXCS30001', 'EXCS30007']).toContain(chose(['machine-learning'])[0])
  })
})

describe('generatePlan counts a done subject it has no data for', () => {
  it('as a 12.5-point option of a choice, as the course check does, so it adds no second one', () => {
    // A choice met by a subject on the record that isn't curated yet (ZZZZ30001).
    const computing = data.components.find((c) => c.id === 'ex-computing')!
    const withUncurated = {
      ...computing,
      id: 'ex-computing-uncurated',
      requirements: [{ all: ['EXCS30002', 'EXCS30004', 'EXCS30005'] }, { choose: { points: 12.5, from: ['ZZZZ30001', 'EXCS30001', 'EXCS30003', 'EXCS30006', 'EXCS30007'] } }],
    } as typeof computing
    const r = generate({
      data: { ...data, components: [...data.components, withUncurated] },
      major: 'ex-computing-uncurated',
      profile: { ...profile, results: [{ code: 'ZZZZ30001', mark: 75 }] },
    })
    expect(r.notes.filter((n) => n.key === 'chose')).toEqual([])
  })
})
