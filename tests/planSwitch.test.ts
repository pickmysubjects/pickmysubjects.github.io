import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { usePlan } from '../src/composables/usePlan'
import { provideDataset } from '../src/composables/useDataset'
import type { Dataset } from '../src/engine'

// The app fetches its data before mounting; here the full set comes straight from disk.
provideDataset(JSON.parse(readFileSync(new URL('../src/generated/real.json', import.meta.url), 'utf8')) as Dataset)

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
  it('a never-built default is not restored, and a changed field rebuilds', () => {
    const plan = usePlan()
    const base = { ...plan.setup.value, course: 'B-SCI', courseYear: 2026, major: '', specialisation: '', field: 'computing', startYear: 2027, startPeriod: 'semester-1' as const }
    plan.updateSetup(base)
    plan.generate()
    plan.updateSetup({ ...base, course: 'B-COM', major: 'finance', field: '' })
    plan.generate()
    expect(plan.updateSetup({ ...base, field: 'chemphys' })).toBe(false)
  })
})
