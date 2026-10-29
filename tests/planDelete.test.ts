import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { books, type PlanState } from '../src/composables/planStore'
import { provideDataset } from '../src/composables/useDataset'
import type { Dataset } from '../src/engine'

provideDataset(JSON.parse(readFileSync(new URL('../src/generated/real.json', import.meta.url), 'utf8')) as Dataset)

const codes = (s: PlanState) => s.terms.flatMap((t) => t.subjects)

describe('deleting and clearing plans', () => {
  it('deleting a later plan leaves the others as they were and opens the nearest one', async () => {
    const { usePlan } = await import('../src/composables/usePlan')
    const { usePlans } = await import('../src/composables/usePlans')
    const { useProfile } = await import('../src/composables/useProfile')
    books.value = {}
    const plan = usePlan()
    const plans = usePlans()
    const me = useProfile()
    me.setResults([{ code: 'MAST10006', mark: 80 }])
    plan.updateSetup({ ...plan.setup.value, course: 'B-SCI', startYear: 2027, startPeriod: 'semester-1' })
    plan.addSubject(0, 'COMP10001')
    plans.create('copy')
    plans.rename(plans.active.value.id, 'Backup')
    plans.create('copy')
    const [a, b, c] = plans.list.value.map((p) => ({ ...p }))

    plans.switchTo(b!.id)
    plans.remove(b!.id)
    expect(plans.list.value.map((p) => p.label)).toEqual(['A', 'C'])
    expect(plans.list.value.map((p) => p.name)).toEqual([a!.name, c!.name])
    expect(plans.active.value.id).toBe(a!.id)
    expect(codes(plans.active.value)).toContain('COMP10001')
    expect(me.profile.value.results).toEqual([{ code: 'MAST10006', mark: 80 }])
  })

  it('with one plan left, it is started over instead of removed; the record stays', async () => {
    const { usePlan } = await import('../src/composables/usePlan')
    const { usePlans } = await import('../src/composables/usePlans')
    const { useProfile } = await import('../src/composables/useProfile')
    books.value = {}
    const plan = usePlan()
    const plans = usePlans()
    const me = useProfile()
    me.setResults([{ code: 'MAST10006', mark: 80 }])
    plan.updateSetup({ ...plan.setup.value, course: 'B-SCI', startYear: 2027, startPeriod: 'semester-1' })
    plan.addSubject(0, 'COMP10001')
    plans.rename(plans.active.value.id, 'Mine')
    const id = plans.active.value.id

    plans.remove(id)
    expect(plans.list.value).toHaveLength(1)
    plans.clear(id)
    expect(plans.list.value).toHaveLength(1)
    expect(plans.active.value).toMatchObject({ id, label: 'A' })
    expect(plans.active.value.name).toBeUndefined()
    expect(plan.isEmpty.value).toBe(true)
    expect(plan.setupChosen.value).toBe(false)
    expect(me.profile.value.results).toEqual([{ code: 'MAST10006', mark: 80 }])
  })
})
