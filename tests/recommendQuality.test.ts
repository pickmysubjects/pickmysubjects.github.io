import { describe, expect, it } from 'vitest'
import { recommend, referencedSubjects, type Profile } from '../src/engine'
import { realData } from './realData'
import { dataset, subject } from './helpers'

/** Simulated students on the real data: does the top of the list make sense for them? */
describe('recommendation quality (real data)', () => {
  const real = realData()
  const base: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
  const top = (p: Partial<Profile>, opts: Parameters<typeof recommend>[2] = {}) =>
    recommend(real, { ...base, ...p }, { course: 'B-SCI', limit: 6, year: 2026, ...opts }).map((r) => r.code)
  const area = (code: string) => real.subjects[code]?.area

  it('an untagged area still matches: biology interest gets biology subjects first', () => {
    // A biology department's subject, or one whose name says it's about biology (the
    // statistics subject for biologists, say).
    const biological = (c: string) =>
      ['BIOL', 'GENE', 'ZOOL', 'BOTA', 'MIIM', 'ANAT', 'PHYS'].includes(area(c) ?? '') ||
      /biolog/i.test(real.subjects[c]?.title ?? '') ||
      (real.subjects[c]?.topics ?? []).includes('biology')
    expect(top({ interests: ['biology'] }).slice(0, 3).every(biological)).toBe(true)
  })

  it('related interests rank above subjects we know nothing about', () => {
    const list = top({ interests: ['finance'] })
    expect(list[0]).toBe('FNCE10002')
    // A commerce or maths subject, or one tagged with a business topic (biotech commercialisation).
    const business = new Set(['economics', 'finance', 'accounting', 'marketing', 'law', 'business'])
    // Or a first step into a finance subject (programming before Algorithmic Trading).
    const stepToFinance = (c: string) =>
      Object.values(real.subjects).some((s) => s.topics.includes('finance') && JSON.stringify(s.prerequisites).includes(`"${c}"`))
    const related = (c: string) =>
      ['ACCT', 'ECON', 'BLAW', 'MKTG', 'FNCE', 'MAST'].includes(area(c) ?? '') || (real.subjects[c]?.topics ?? []).some((t) => business.has(t)) || stepToFinance(c)
    expect(list.filter(related)).toEqual(list)
  })

  it('a second-year ML student gets the next step towards machine learning, not unknown filler', () => {
    const list = top({
      interests: ['machine-learning'],
      results: [
        { code: 'COMP10001', mark: 85 },
        { code: 'COMP10002', mark: 82 },
        { code: 'MAST10006', mark: 75 },
        { code: 'MAST10007', mark: 78 },
      ],
    })
    expect(list[0]).toBe('COMP20008') // COMP30027 needs it
    expect(list.some((c) => ['CEDB', 'CVEN', 'ELEN'].includes(area(c) ?? ''))).toBe(false)
  })

  it('a subject that only leads to an interest does not outrank one on it (path counted once)', () => {
    const list = recommend(real, { ...base, interests: ['psychology'], results: [{ code: 'PSYC10003' }, { code: 'PSYC10004' }] }, { course: 'B-SCI', year: 2027, maxLevel: 2 }).map((r) => r.code)
    expect(list.indexOf('PSYC20006')).toBeLessThan(list.indexOf('BIOL10008'))
  })

  it('a declared major puts the way into it first, even where there are several routes', () => {
    const done = ['SCIE10005', 'PSYC10003', 'PSYC10004', 'PSYC20007', 'ECON10004', 'ATOC10001'].map((code) => ({ code }))
    const recs = recommend(real, { ...base, results: done }, { course: 'B-SCI', year: 2028, term: { year: 2028, period: 'semester-1' }, maxLevel: 2, programme: { courseYear: 2026, components: ['psychology'] }, limit: 2 })
    // The two level-2 psychology subjects open to this student in Semester 1.
    expect(recs.map((r) => r.code).sort()).toEqual(['PSYC20006', 'PSYC20008'])
    expect(recs.every((r) => r.reasons.some((n) => n.key === 'majorPath' || n.key === 'majorCore' || n.key === 'majorOption'))).toBe(true)
  })

  it('a WAM-focused student who struggles with maths is steered away from maths', () => {
    const list = top({ goal: 'wam', skills: { maths: 1 }, results: [{ code: 'MAST10006', mark: 52 }, { code: 'BIOL10008', mark: 80 }] })
    expect(list.some((c) => area(c) === 'MAST')).toBe(false)
  })

  it('never suggests a subject that is not running, or one that gives no credit in the course', () => {
    const all = recommend(real, base, { course: 'B-SCI', year: 2026 }).map((r) => r.code)
    for (const c of ['COMP20004', 'ACCT20008', 'MAST10025', 'MAST10026']) expect(all).not.toContain(c)
  })
})

describe('recommendation statistics', () => {
  const base: Profile = { results: [], skills: {}, interests: [], goal: 'wam' }

  it('two or three glowing reviews do not beat many good ones (Bayesian average)', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none', non_allowed: [], signals: { reviews: 2, difficulty: 1, workload: 1, grading: 5 } }),
      subject({ code: 'AAAA10002', prerequisites: 'none', non_allowed: [], signals: { reviews: 40, difficulty: 2, workload: 2, grading: 4 } }),
    ])
    expect(recommend(data, base).map((r) => r.code)[0]).toBe('AAAA10002')
  })

  it('breaks a run of three from the same area with a near-tie from another area', () => {
    const data = dataset(
      ['AAAA10001', 'AAAA10002', 'AAAA10003', 'BBBB10001'].map((code) => subject({ code, area: code.slice(0, 4), prerequisites: 'none', non_allowed: [] })),
    )
    const order = recommend(data, { ...base, goal: 'balanced' }).map((r) => r.code)
    expect(order.slice(0, 3)).toContain('BBBB10001')
  })

  it('one strong related mark moves the prediction toward it, but not all the way', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none', non_allowed: [] }),
      subject({ code: 'BBBB10001', prerequisites: 'none', non_allowed: [] }),
      subject({ code: 'AAAA20001', level: 2, prerequisites: 'AAAA10001', non_allowed: [] }),
    ])
    const profile = { ...base, goal: 'balanced' as const, results: [{ code: 'AAAA10001', mark: 95 }, { code: 'BBBB10001', mark: 55 }] }
    const r = recommend(data, profile).find((x) => x.code === 'AAAA20001')
    const averaged = r?.reasons.find((n) => n.key === 'averagedHigh')
    expect(averaged).toBeDefined() // the related mark still counts for a lot
  })

  it('a prerequisite the student confirmed (a VCE score) no longer shows as unconfirmed', () => {
    const data = dataset([subject({ code: 'AAAA10001', prerequisites: { manual: 'VCE Maths study score 25+' }, non_allowed: [] })])
    const before = recommend(data, base)[0]
    const after = recommend(data, { ...base, confirmed: ['AAAA10001'] })[0]
    expect(before?.eligibility).toBe('unknown')
    expect(after?.eligibility).toBe('ok')
    expect(after?.warnings.some((w) => w.key === 'eligibilityUnknown')).toBe(false)
  })

  it('equal scores put the subject more of the degree builds on first, not the first code', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none', non_allowed: [] }),
      subject({ code: 'ZZZZ10001', prerequisites: 'none', non_allowed: [] }),
      subject({ code: 'ZZZZ20001', level: 2, prerequisites: 'ZZZZ10001', non_allowed: [] }),
    ])
    // Balanced: "opens up" has no weight there, so the two really tie.
    expect(recommend(data, { ...base, goal: 'balanced' }, { maxLevel: 1 }).map((r) => r.code)).toEqual(['ZZZZ10001', 'AAAA10001'])
  })

  it('a subject one level below the student’s year gives up a little to one at their level', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none', non_allowed: [], categories: { 'B-SCI': 'science' } }),
      subject({ code: 'BBBB20001', level: 2, prerequisites: 'none', non_allowed: [], categories: { 'B-SCI': 'science' } }),
    ])
    const recs = recommend(data, { ...base, goal: 'balanced' }, { course: 'B-SCI', maxLevel: 2 })
    expect(recs.map((r) => r.code)).toEqual(['BBBB20001', 'AAAA10001'])
  })

  it('a subject from the interest’s own discipline beats one that touches it among other topics', () => {
    const data = dataset([
      subject({ code: 'GEOG10001', area: 'GEOG', topics: ['environment', 'psychology', 'geography'], prerequisites: 'none', non_allowed: [] }),
      subject({ code: 'PSYC10001', area: 'PSYC', topics: ['psychology'], prerequisites: 'none', non_allowed: [] }),
    ])
    expect(recommend(data, { ...base, goal: 'balanced', interests: ['psychology'] }).map((r) => r.code)).toEqual(['PSYC10001', 'GEOG10001'])
  })

  it('versions of one subject (non-allowed with each other) don’t fill the top together', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', topics: ['statistics'], prerequisites: 'none', non_allowed: ['AAAA10002'] }),
      subject({ code: 'AAAA10002', topics: ['statistics'], prerequisites: 'none', non_allowed: ['AAAA10001'] }),
      subject({ code: 'BBBB10001', topics: ['biology'], prerequisites: 'none', non_allowed: [] }),
    ])
    const codes = recommend(data, { ...base, goal: 'balanced', interests: ['statistics'] }).map((r) => r.code)
    // The second version waits until after the other subject, though it scores higher.
    expect(codes).toEqual(['AAAA10001', 'BBBB10001', 'AAAA10002'])
  })

  it('maxLevel keeps a first-year list to first-year subjects', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none', non_allowed: [] }),
      subject({ code: 'AAAA30001', level: 3, prerequisites: 'none', non_allowed: [] }),
    ])
    expect(recommend(data, base, { maxLevel: 1 }).map((r) => r.code)).toEqual(['AAAA10001'])
  })
})

describe('order: prerequisites first, and with nothing filled in', () => {
  const real = realData()
  const base: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }

  it('a subject never ranks above an in-data way into it the student hasn\'t done, in any goal', () => {
    // Reviewer repro: COMP10002 (COMP10001, COMP10003 or a programming test we can't check) came
    // first, above COMP10001; MAST10007 and MAST10006 above MAST10005.
    const p = { skills: { programming: 5, maths: 2 }, interests: ['machine-learning'] }
    for (const goal of ['balanced', 'challenge', 'wam', 'easy'] as const) {
      const codes = recommend(real, { ...base, ...p, goal }, { course: 'B-SCI', maxLevel: 1, year: 2026 }).map((r) => r.code)
      const at = (c: string) => codes.indexOf(c)
      expect([goal, at('COMP10001') < at('COMP10002')]).toEqual([goal, true])
      expect([goal, at('MAST10005') < at('MAST10007'), at('MAST10005') < at('MAST10006')]).toEqual([goal, true, true])
    }
    // The rule in general: across degrees, goals and years, one of the in-data ways in comes first
    // (two subjects that each accept the other aside: one of them has to go first).
    const profiles: Partial<Profile>[] = [{}, p, { skills: { lab: 5 }, interests: ['chemistry', 'biology'] }, { results: [{ code: 'COMP10001', mark: 80 }], interests: ['finance'] }]
    let checked = 0
    for (const course of ['B-SCI', 'B-COM', 'B-DES']) for (const goal of ['balanced', 'challenge', 'wam', 'easy'] as const) for (const prof of profiles) {
      const recs = recommend(real, { ...base, ...prof, goal }, { course, maxLevel: 2, year: 2026 })
      const pos = new Map(recs.map((r, i) => [r.code, i]))
      recs.forEach((r, i) => {
        if (r.eligibility !== 'unknown') return
        const ways = referencedSubjects(real.subjects[r.code]!.prerequisites).filter((c) => pos.has(c) && !referencedSubjects(real.subjects[c]!.prerequisites).includes(r.code))
        if (!ways.length) return
        checked++
        expect([course, goal, r.code, ways.some((c) => pos.get(c)! < i)]).toEqual([course, goal, r.code, true])
      })
    }
    expect(checked).toBeGreaterThan(100)
  }, 60_000)

  it('an unconfirmed condition (a VCE score) costs a little in every goal, not only for a WAM', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: { manual: 'VCE Maths study score 25+' }, non_allowed: [] }),
      subject({ code: 'BBBB10001', prerequisites: 'none', non_allowed: [] }),
    ])
    for (const goal of ['balanced', 'challenge', 'wam', 'easy'] as const) {
      const recs = recommend(data, { ...base, goal })
      const score = (c: string) => recs.find((r) => r.code === c)!.score
      expect([goal, score('AAAA10001') < score('BBBB10001')]).toEqual([goal, true])
      expect(recs.find((r) => r.code === 'AAAA10001')!.factors?.some((f) => f.key === 'unconfirmed')).toBe(true)
      // Said they meet it: no cost.
      const ok = recommend(data, { ...base, goal, confirmed: ['AAAA10001'] })
      expect(ok.find((r) => r.code === 'AAAA10001')!.score).toBe(ok.find((r) => r.code === 'BBBB10001')!.score)
    }
  })

  it('nothing filled in: the degree\'s own common first subjects, each saying why, not a tie broken by chance', () => {
    // Reviewer repro: 74 of 202 tied at 55 and Latin 3/4, Italian 7 led the list.
    const recs = recommend(real, base, { course: 'B-SCI', maxLevel: 1, year: 2026, startHere: true })
    const n = (r: (typeof recs)[number]) => {
      const why = r.reasons.find((x) => x.key === 'degreeCore' || x.key === 'manyMajors')
      return why ? (why.key === 'degreeCore' ? Infinity : Number(why.params.n)) : 0
    }
    const top = recs.slice(0, 10)
    // Every one of the top ten is something the degree's majors use, and says so.
    expect(top.every((r) => n(r) > 0)).toBe(true)
    // Ordered by how many of the degree's majors use it (prerequisite order aside).
    const free = top.filter((r) => r.eligibility === 'ok').map(n)
    expect(free).toEqual([...free].sort((a, b) => b - a))
    // No subject only a placement test or a VCE language score lets in.
    for (const r of top) expect(real.subjects[r.code]!.area).not.toMatch(/^(CLAS|ITAL|SPAN|FREN|GERM|CHIN|JAPN)$/)
    // A goal about marks keeps its own order (easy to do well in), and anything filled in turns it off.
    expect(recommend(real, { ...base, goal: 'wam' }, { course: 'B-SCI', maxLevel: 1, year: 2026, startHere: true }).some((r) => r.reasons.some((x) => x.key === 'manyMajors'))).toBe(false)
    expect(recommend(real, { ...base, interests: ['biology'] }, { course: 'B-SCI', maxLevel: 1, year: 2026, startHere: true }).some((r) => r.reasons.some((x) => x.key === 'manyMajors'))).toBe(false)
    // No course: nothing to read the majors from, the ordinary order; nor for the plan builder,
    // which picks by score and doesn't ask for it.
    expect(recommend(real, base, { maxLevel: 1, year: 2026, startHere: true }).some((r) => r.reasons.some((x) => x.key === 'manyMajors'))).toBe(false)
    expect(recommend(real, base, { course: 'B-SCI', maxLevel: 1, year: 2026 }).some((r) => r.reasons.some((x) => x.key === 'manyMajors'))).toBe(false)
  })
})
