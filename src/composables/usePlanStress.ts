import { computed } from 'vue'
import { planStress, relieveTerm, termStress, type Relief, type Skill, type TermStress } from '@/engine'
import { useDataset } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'

/** Each semester's load, judged against the whole plan, and the ways to make a heavy one lighter. */
export function usePlanStress() {
  const plan = usePlan()
  const { data } = useDataset()
  const { profile } = useProfile()

  const stress = computed(() => planStress(plan.terms.value.map((t) => t.subjects), data.value, profile.value))
  const stackFloor = computed(
    () => Object.fromEntries(stress.value.unavoidable.map((u) => [u.skill, u.perTerm])) as Partial<Record<Skill, number>>,
  )

  /** A semester's load if it held these subjects (for "adding this makes it heavier"). */
  function stressWith(codes: string[]): TermStress {
    return termStress(codes, data.value, profile.value, { stackFloor: stackFloor.value })
  }

  function relief(termIndex: number): Relief | null {
    if (stress.value.terms[termIndex]?.level === 'ok') return null
    return relieveTerm(plan.plan.value, data.value, termIndex, profile.value)
  }

  return { stress, stressWith, relief, applyRelief: plan.applyRelief }
}
