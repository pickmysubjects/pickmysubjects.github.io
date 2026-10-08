import { describe, expect, it } from 'vitest'
import { decodePlan, encodePlan } from '../src/utils/sharePlan'

describe('shared plan links', () => {
  const setup = { course: 'B-SCI', courseYear: 2026, startYear: 2027, startPeriod: 'semester-1' as const, major: 'data-science', specialisation: '' }
  const terms = [
    { year: 2027, period: 'semester-1' as const, subjects: ['COMP10001', 'MAST10006'] },
    { year: 2028, period: 'summer' as const, subjects: [] },
  ]

  it('round-trips a plan', () => {
    expect(decodePlan(encodePlan(setup, terms))).toEqual({ setup, terms })
  })

  it('is safe in a URL', () => {
    expect(encodePlan(setup, terms)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('rejects cut-off or edited links', () => {
    const code = encodePlan(setup, terms)
    expect(decodePlan(code.slice(0, 20))).toBeNull()
    expect(decodePlan('not-a-plan')).toBeNull()
  })
})
