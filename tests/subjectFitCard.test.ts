import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { books } from '../src/composables/planStore'
import { provideDataset } from '../src/composables/useDataset'
import { recommend } from '../src/engine'
import { realData } from './realData'

/** The card's composable: per-plan strengths/interests/goal, the shared record, and Find subjects' own list. */
describe('useSubjectFit', () => {
  provideDataset(realData())

  it('no profile: difficulty only; each plan its own fit; same as sort for me', async () => {
    const { usePlan } = await import('../src/composables/usePlan')
    const { usePlans } = await import('../src/composables/usePlans')
    const { useProfile } = await import('../src/composables/useProfile')
    const { useDataset } = await import('../src/composables/useDataset')
    const { useSortForMeOptions, useSubjectFit } = await import('../src/composables/useSubjectFit')
    books.value = {}
    const plan = usePlan()
    const plans = usePlans()
    const me = useProfile()
    plan.updateSetup({ ...plan.setup.value, course: 'B-SCI', major: '', startYear: 2027, startPeriod: 'semester-1' })

    const code = ref('COMP10001')
    const card = useSubjectFit(code, ref(2026))
    expect(card.hasProfile.value).toBe(false)
    expect(card.fit.value).toBeNull()
    expect(card.difficulty.value.level).not.toBe('unknown')

    // Plan A: a coder.
    me.setSkills({ programming: 5 })
    me.setInterests(['ai', 'programming'])
    const idA = plans.active.value.id
    expect(card.fit.value?.kind).toBe('fit')
    const fitA = card.fit.value!.kind === 'fit' ? card.fit.value!.rec.betterThan : -1
    // Exactly the "sort for me" list Find subjects builds from the same composables.
    const { data } = useDataset()
    const browse = recommend(data.value, me.profile.value, useSortForMeOptions().value).find((r) => r.code === 'COMP10001')!
    expect(fitA).toBe(browse.betterThan)

    // Plan B: a writer who finds programming hard. The record is shared, the prefs aren't.
    plans.create('copy')
    me.setSkills({ writing: 5, programming: 1 })
    me.setInterests(['literature'])
    const fitB = card.fit.value!.kind === 'fit' ? card.fit.value!.rec.betterThan : -1
    expect(fitB).toBeLessThan(fitA)

    plans.switchTo(idA)
    expect(card.fit.value!.kind === 'fit' && card.fit.value!.rec.betterThan).toBe(fitA)

    // A result shared by both plans: done, in either.
    me.setResults([{ code: 'COMP10001', mark: 80 }])
    expect(card.fit.value).toMatchObject({ kind: 'out', why: { key: 'done' } })
    plans.switchTo(plans.list.value.find((p) => p.id !== idA)!.id)
    expect(card.fit.value).toMatchObject({ kind: 'out', why: { key: 'done' } })

    // Planned in this plan only.
    code.value = 'MAST10006'
    plan.addSubject(0, 'MAST10006')
    expect(card.fit.value).toMatchObject({ kind: 'out', why: { key: 'planned' } })
    plans.switchTo(idA)
    expect(card.fit.value?.kind).toBe('fit')
  })
})
