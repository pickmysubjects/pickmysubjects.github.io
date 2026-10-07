import { describe, expect, it } from 'vitest'
import { computeWam, recommend, type Profile } from '../src/engine/recommend'
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
