import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { books } from '../src/composables/planStore'
import { provideDataset } from '../src/composables/useDataset'
import type { Dataset } from '../src/engine'

provideDataset(JSON.parse(readFileSync(new URL('../src/generated/real.json', import.meta.url), 'utf8')) as Dataset)

// A changed category must come off again: by going back to the Handbook's, and with Undo all.
describe('undoing "counts as"', () => {
  it('back to the Handbook, and Undo all, remove the override for good', async () => {
    const { usePlan } = await import('../src/composables/usePlan')
    books.value = {}
    const plan = usePlan()
    plan.updateSetup({ ...plan.setup.value, course: 'B-SCI', startYear: 2027, startPeriod: 'semester-1' })
    plan.addSubject(0, 'COMP10001')
    plan.setCountsAs('COMP10001', 'breadth')
    expect(plan.countsAs.value).toEqual({ COMP10001: 'breadth' })
    plan.setCountsAs('COMP10001', undefined)
    expect(plan.countsAs.value).toEqual({})

    plan.setCountsAs('COMP10001', 'breadth')
    plan.addSubject(0, 'MAST10006')
    plan.setCountsAs('MAST10006', 'breadth')
    plan.clearCountsAs()
    expect(plan.countsAs.value).toEqual({})
  })
})
