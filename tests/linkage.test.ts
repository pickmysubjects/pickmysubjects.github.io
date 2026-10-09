import { describe, expect, it } from 'vitest'
import { generatePlan } from '../src/engine/generate'
import { recommend, type Profile } from '../src/engine/recommend'
import { checkTerms } from '../src/engine/planCheck'
import { buildDataset } from '../scripts/dataset'
import { dataset, subject } from './helpers'

/** What the student enters under Me reaches the plan and the suggestions the same way. */
describe('Me → Plan → Suggestions (real data)', () => {
  const { dataset: d } = buildDataset('real')
  const P = (p: Partial<Profile> = {}): Profile => ({ results: [], skills: {}, interests: [], goal: 'balanced', ...p })
  const plan = (p: Profile) =>
    generatePlan({ data: d, profile: p, course: 'B-SCI', courseYear: 2026, major: 'data-science', startYear: 2027, startPeriod: 'semester-1' }).plan
  const codes = (p: Profile) => plan(p).terms.flatMap((t) => t.subjects)

  it('a passed subject is neither planned again nor suggested', () => {
    const p = P({ results: [{ code: 'COMP10001', mark: 80 }] })
    expect(codes(p)).not.toContain('COMP10001')
    expect(recommend(d, p, { course: 'B-SCI' }).map((r) => r.code)).not.toContain('COMP10001')
  })

  it('a failed compulsory subject is planned again', () => {
    expect(codes(P({ results: [{ code: 'COMP10001', mark: 40 }] }))).toContain('COMP10001')
  })

  it('for a chosen semester, a prerequisite planned later does not count', () => {
    const first = plan(P()).terms[0]!
    const recs = recommend(d, P(), { course: 'B-SCI', term: { year: first.year, period: first.period }, eligibleWith: [] }).map((r) => r.code)
    expect(recs).not.toContain('COMP20003') // needs COMP10002
  })

  it('interests steer the free electives', () => {
    expect(codes(P({ interests: ['machine-learning'] })).join()).not.toBe(codes(P({ interests: ['biology'] })).join())
  })

  it('"I meet it" clears an uncheckable condition', () => {
    const r = recommend(d, P({ confirmed: ['MAST10005'] }), { course: 'B-SCI' }).find((x) => x.code === 'MAST10005')
    expect(r?.eligibility).toBe('ok')
    expect(r?.warnings.some((w) => w.key === 'eligibilityUnknown')).toBe(false)
  })

  it('a passed subject still sitting in the plan is flagged', () => {
    const pl = { ...plan(P()), completed: ['COMP10001'] }
    expect(checkTerms(pl, d).some((i) => i.subject === 'COMP10001' && i.kind === 'duplicate')).toBe(true)
  })
})

describe('suggestions for a chosen semester', () => {
  it('say so, and rank lower, when they would make it heavy', () => {
    const exam = (code: string) => subject({ code, prerequisites: 'none', assessment: [{ kind: 'exam', weight: 80 }, { kind: 'assignment', weight: 20 }] })
    const light = subject({ code: 'BIOL10001', prerequisites: 'none', assessment: [{ kind: 'exam', weight: 30 }, { kind: 'assignment', weight: 70 }] })
    const data = dataset([exam('AAAA10001'), exam('AAAA10002'), exam('AAAA10003'), light, subject({ code: 'CCCC10001', prerequisites: 'none' })])
    const p: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
    const recs = recommend(data, p, { termSubjects: ['AAAA10001', 'AAAA10002', 'CCCC10001'] })
    const third = recs.find((r) => r.code === 'AAAA10003')
    expect(third?.warnings.map((w) => w.key)).toContain('makesHeavy')
    expect(recs.find((r) => r.code === 'BIOL10001')?.warnings.map((w) => w.key) ?? []).not.toContain('makesHeavy')
  })
})
