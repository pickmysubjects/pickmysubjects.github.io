import { describe, expect, it } from 'vitest'
import { computeWam, recommend, type Profile } from '../src/engine/recommend'
import { buildDataset } from '../scripts/dataset'
import { dataset, demo, subject } from './helpers'

const base: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }

describe('computeWam', () => {
  it('is a credit-point weighted average that ignores unmarked results', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', points: 12.5 }),
      subject({ code: 'AAAA10002', points: 25 }),
    ])
    expect(
      computeWam([{ code: 'AAAA10001', mark: 90 }, { code: 'AAAA10002', mark: 60 }, { code: 'AAAA10003' }], data),
    ).toBe(70)
    expect(computeWam([], data)).toBeNull()
  })
})

describe('recommend (non-allowed)', () => {
  it('treats non-allowed as two-way even when only one subject lists it', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none', non_allowed: ['AAAA10002'] }),
      subject({ code: 'AAAA10002', prerequisites: 'none' }), // its own list isn't curated
    ])
    expect(recommend(data, { ...base, results: [{ code: 'AAAA10001' }] }).map((r) => r.code)).not.toContain('AAAA10002')
    expect(recommend(data, { ...base, results: [{ code: 'AAAA10002' }] }).map((r) => r.code)).not.toContain('AAAA10001')
  })
})

describe('recommend (demo data)', () => {
  const data = demo()

  it('never recommends subjects whose prerequisites clearly fail, or completed/non-allowed ones', () => {
    const recs = recommend(data, { ...base, results: [{ code: 'EXCS90001' }] })
    const codes = recs.map((r) => r.code)
    expect(codes).not.toContain('EXCS30001') // prereqs missing AND non-allowed with EXCS90001
    expect(codes).not.toContain('EXCS90001') // already completed
    expect(codes).not.toContain('EXCS20001') // needs EXCS10002
    expect(codes).toContain('EXCS10001')
  })

  it('a WAM-focused student is steered toward generous, approachable subjects', () => {
    const wam = recommend(data, { ...base, goal: 'wam' }, { course: 'EX-SCI', category: 'breadth', level: 1 })
    expect(wam[0]?.code).toBe('EXMG10001') // easiest, most generously marked breadth subject
    expect(wam[0]?.reasons.map((n) => n.text).join(' ')).toMatch(/generous/)
  })

  it('a challenge-seeker with matching interests gets the interesting hard subject first', () => {
    const profile: Profile = {
      ...base,
      goal: 'challenge',
      interests: ['machine-learning', 'ai'],
      results: [
        { code: 'EXCS10001', mark: 88 },
        { code: 'EXCS20002', mark: 85 },
        { code: 'EXMA10002', mark: 80 },
      ],
      skills: { maths: 4, programming: 5, statistics: 4 },
    }
    const recs = recommend(data, profile, { course: 'EX-SCI' })
    expect(recs[0]?.code).toBe('EXCS30001')
    const text = recs[0]?.reasons.map((n) => n.text).join(' ') ?? ''
    expect(text).toMatch(/interested in/)
    expect(text).toMatch(/averaged/)
    expect(text).toMatch(/Opens up EXCS30007/)
  })

  it('treats weak related marks as a warning, not a reason', () => {
    const recs = recommend(data, { ...base, results: [{ code: 'EXMA10001', mark: 45 }] })
    const linAlg = recs.find((r) => r.code === 'EXMA10002') // same area, no prerequisites
    expect(linAlg?.reasons.map((n) => n.text).join(' ')).not.toMatch(/averaged/)
    expect(linAlg?.warnings.map((n) => n.text).join(' ')).toMatch(/averaged only 45/)
  })

  it('warns when the student is weak in a skill the subject leans on', () => {
    const recs = recommend(data, { ...base, skills: { maths: 1 } })
    const calc = recs.find((r) => r.code === 'EXMA10001')
    expect(calc?.warnings.map((n) => n.text).join(' ')).toMatch(/maths/)
  })

  it('shrinks thin review data toward neutral and says so', () => {
    const recs = recommend(data, { ...base, goal: 'wam' }, { course: 'EX-SCI', category: 'breadth', level: 2 })
    const thin = recs.find((r) => r.code === 'EXMG20001') // only 2 reviews
    expect(thin?.warnings.map((n) => n.text).join(' ')).toMatch(/Only 2 reviews/)
  })

  it('lets a failed subject be taken again, and does not count it towards prerequisites', () => {
    const recs = recommend(data, { ...base, results: [{ code: 'EXCS10001', mark: 42 }] }).map((r) => r.code)
    expect(recs).toContain('EXCS10001') // retake
    expect(recs).not.toContain('EXCS10002') // needs a *pass* in EXCS10001
  })

  it('filters by term availability', () => {
    const s2 = recommend(data, base, { term: { year: 2026, period: 'semester-2' } }).map((r) => r.code)
    expect(s2).not.toContain('EXBI10001') // semester 1 only
    expect(s2).toContain('EXMG10001')
  })

  it('marks eligibility as unknown when prerequisites include free text', () => {
    const phys = recommend(data, base).find((r) => r.code === 'EXPH10001')
    expect(phys?.eligibility).toBe('unknown')
    expect(phys?.warnings.map((n) => n.text).join(' ')).toMatch(/Eligibility not confirmed: .*VCE Specialist Mathematics/)
  })
})

describe('recommend (going backwards)', () => {
  it('never suggests a prerequisite of a subject already passed', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none' }),
      subject({ code: 'AAAA10002', prerequisites: 'AAAA10001' }),
      subject({ code: 'AAAA10003', prerequisites: 'none' }),
    ])
    const codes = recommend(data, { ...base, results: [{ code: 'AAAA10002', mark: 80 }] }).map((r) => r.code)
    expect(codes).toEqual(['AAAA10003'])
  })
})

describe('subject facts', () => {
  it('rejects assessment weights that do not add up to 100, and unknown topics', () => {
    expect(() => subject({ code: 'AAAA10001', assessment: [{ kind: 'exam', weight: 60 }, { kind: 'project', weight: 30 }] })).toThrow(
      /add up to 100/,
    )
    expect(() => subject({ code: 'AAAA10001', topics: ['basket-weaving'] })).toThrow()
    expect(subject({ code: 'AAAA10001', assessment: [{ kind: 'exam', weight: 60 }, { kind: 'project', weight: 40, group: true }] }).assessment).toHaveLength(2)
  })

  it('uses curated topics on real data: machine learning first-years see the way in, not unrated filler', () => {
    const { dataset: real } = buildDataset('real')
    // Level 1 only, as the For-you page shows a first-year.
    const fresh = recommend(real, { ...base, interests: ['machine-learning'] }, { course: 'B-SCI', limit: 6, maxLevel: 1 }).map((r) => r.code)
    // The way to COMP30027: programming plus the first-year maths it needs.
    expect(fresh).toEqual(expect.arrayContaining(['COMP10002', 'COMP10001', 'MAST10007']))
    expect(fresh).not.toContain('ACTL30008') // no topics curated: neutral, so below real matches
    const ready = recommend(
      real,
      { ...base, interests: ['machine-learning'], results: [{ code: 'COMP10002', mark: 80 }, { code: 'COMP20008', mark: 80 }] },
      { course: 'B-SCI', limit: 3 },
    ).map((r) => r.code)
    expect(ready).toContain('COMP30027')
  })
})

describe('the five skill steps read differently', () => {
  const data = dataset([subject({ code: 'CHEM10003', prerequisites: 'none', skills: ['lab'] })])
  const keys = (lab: number) => {
    const r = recommend(data, { results: [], skills: { lab }, interests: [], goal: 'balanced' }, {})[0]
    return [...(r?.reasons ?? []), ...(r?.warnings ?? [])].map((n) => n.key).filter((k) => k !== 'fewReviews')
  }
  it('strong, good at, neutral, weaker, a struggle', () => {
    expect(keys(5)).toEqual(['strengths'])
    expect(keys(4)).toEqual(['goodAt'])
    expect(keys(3)).toEqual([])
    expect(keys(2)).toEqual(['weakSkills'])
    expect(keys(1)).toEqual(['struggleSkills'])
  })
  it('scores each step lower than the one above', () => {
    const score = (lab: number) => recommend(data, { results: [], skills: { lab }, interests: [], goal: 'balanced' }, {})[0]?.score ?? 0
    expect([5, 4, 3, 2, 1].map(score)).toEqual([...[5, 4, 3, 2, 1].map(score)].sort((a, b) => b - a))
    expect(new Set([5, 4, 3, 2, 1].map(score)).size).toBe(5)
  })
})

describe('recommend with the student’s major', () => {
  it('nudges the major’s own subjects up and says why', async () => {
    const { buildDataset } = await import('../scripts/dataset')
    const { recommend, PROGRAMME_BONUS } = await import('../src/engine/recommend')
    const { dataset: real } = buildDataset('real')
    const profile = { results: [], skills: {}, interests: [], goal: 'balanced' as const }
    const base = recommend(real, profile, { course: 'B-SCI', year: 2026 })
    const mine = recommend(real, profile, { course: 'B-SCI', year: 2026, programme: { courseYear: 2026, components: ['geography'] } })
    const geog = mine.find((r) => r.code === 'GEOG20002')
    expect(geog?.reasons[0]?.key).toMatch(/^major(Core|Option)$/)
    expect(geog!.score).toBe(Math.min(100, base.find((r) => r.code === 'GEOG20002')!.score + PROGRAMME_BONUS))
    // Outside the major nothing changes.
    const other = mine.find((r) => r.code === 'COMP10001')
    expect(other?.score).toBe(base.find((r) => r.code === 'COMP10001')?.score)
  })
})

describe('recommend after a fail', () => {
  it('can suggest the subject again, and says it would be a retake', async () => {
    const { buildDataset } = await import('../scripts/dataset')
    const { recommend } = await import('../src/engine/recommend')
    const { dataset: real } = buildDataset('real')
    const profile = { results: [{ code: 'COMP10001', mark: 42 }], skills: {}, interests: [], goal: 'balanced' as const }
    const rec = recommend(real, profile, { course: 'B-SCI', year: 2026 }).find((r) => r.code === 'COMP10001')
    expect(rec?.warnings[0]).toMatchObject({ key: 'retake', params: { mark: 42 } })
    // Passed or planned subjects never come back.
    const passed = recommend(real, { ...profile, results: [{ code: 'COMP10001', mark: 70 }] }, { course: 'B-SCI', year: 2026, planned: ['COMP10002'] })
    expect(passed.some((r) => r.code === 'COMP10001' || r.code === 'COMP10002')).toBe(false)
  })
})
