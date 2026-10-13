import { describe, expect, it } from 'vitest'
import { usePlan } from '../src/composables/usePlan'

describe('switching degree keeps each degree’s plan', () => {
  it('B-SCI → B-COM → B-SCI puts the first plan back unchanged', () => {
    const plan = usePlan()
    const sci = { ...plan.setup.value, course: 'B-SCI', courseYear: 2026, major: 'data-science', specialisation: '', startYear: 2027, startPeriod: 'semester-1' as const }
    plan.updateSetup(sci)
    plan.generate()
    const before = JSON.stringify(plan.terms.value)
    expect(before).toContain('COMP')

    expect(plan.updateSetup({ ...sci, course: 'B-COM', major: 'finance' })).toBe(false)
    plan.generate()
    expect(JSON.stringify(plan.terms.value)).toContain('FNCE')

    expect(plan.updateSetup(sci)).toBe(true)
    expect(JSON.stringify(plan.terms.value)).toBe(before)
    // Back with a different major: rebuilt, not restored.
    expect(plan.updateSetup({ ...sci, course: 'B-COM', major: 'marketing' })).toBe(false)
  })
})
