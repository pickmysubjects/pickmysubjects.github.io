import { describe, expect, it } from 'vitest'
import { generatePlan } from '../../src/engine/generate'
import { checkTerms } from '../../src/engine/planCheck'
import { realData } from '../realData'
import { heavyShare } from './share'

// Each degree judged against its own usual load (2026-10-19: an Arts semester of essays or a
// Design studio's coursework is the norm there, not a heavy semester), so their shares sit near
// Science's. Measured then: B-COM 0.048, B-ARTS 0.015, B-BMED 0.045, B-DES 0.096.
describe('plan builder spreads the load in each degree (real data)', () => {
  it('B-COM', () => {
    expect(heavyShare('B-COM')).toBeLessThan(0.07)
  }, 300_000)
  it('B-ARTS', () => {
    expect(heavyShare('B-ARTS')).toBeLessThan(0.04)
  }, 300_000)
})

describe('every B-COM major plans without clashes (real data)', () => {
  // A couple of these run in courses.test.ts too, for test:fast.
  it('from either start, Actuarial on the mathematics path', () => {
    const data = realData()
    for (const major of data.components.filter((c) => c.course === 'B-COM' && c.kind === 'major').map((c) => c.id)) {
      for (const startPeriod of ['semester-1', 'semester-2'] as const) {
        const { plan: p } = generatePlan({ data, profile: { results: [], skills: {}, interests: [], goal: 'balanced' }, course: 'B-COM', courseYear: 2026, major, startYear: 2027, startPeriod })
        expect(checkTerms(p, data).filter((i) => i.severity === 'error').map((i) => i.message), `${major} ${startPeriod}`).toEqual([])
        if (major === 'actuarial-studies') expect(p.terms.flatMap((t) => t.subjects)).not.toContain('ECON10005')
      }
    }
  }, 120_000)
})
