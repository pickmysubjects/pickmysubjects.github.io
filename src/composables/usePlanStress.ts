import { computed } from 'vue'
import { pinnedIn, planRoles, planStress, relieveTerm, requiredWithPrerequisites, termStress, type Relief, type Skill, type TermStress } from '@/engine'
import { useDataset } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'

/** Each semester's load, judged against the whole plan, and the ways to make a heavy one lighter. */
export function usePlanStress() {
  const plan = usePlan()
  const { data } = useDataset()
  const { profile } = useProfile()

  // What the degree itself requires: only that makes a weak-skill stack unavoidable.
  const fixed = computed(() => {
    const { course, courseYear, major, specialisation, minors } = plan.setup.value
    const roles = planRoles(data.value, course, courseYear, [major, specialisation, ...(minors ?? [])])
    return requiredWithPrerequisites(new Set([...roles.required, ...roles.options]), plan.plannedCodes.value, data.value.subjects, course)
  })
  const stress = computed(() => planStress(plan.terms.value.map((t) => t.subjects), data.value, profile.value, fixed.value, plan.setup.value.course))
  const stackFloor = computed(
    () => Object.fromEntries(stress.value.unavoidable.map((u) => [u.skill, u.perTerm])) as Partial<Record<Skill, number>>,
  )

  /** A semester's load if it held these subjects (for "adding this makes it heavier"). */
  function stressWith(codes: string[]): TermStress {
    return termStress(codes, data.value, profile.value, { stackFloor: stackFloor.value, course: plan.setup.value.course })
  }

  function relief(termIndex: number): Relief | null {
    if (stress.value.terms[termIndex]?.level === 'ok') return null
    return relieveTerm(plan.plan.value, data.value, termIndex, profile.value)
  }

  /** The degree's own subjects in a term that no other term can take: why a heavy term stays heavy. */
  function pinned(termIndex: number): string[] {
    const codes = (plan.terms.value[termIndex]?.subjects ?? []).filter((c) => fixed.value.has(c))
    return pinnedIn(plan.plan.value, data.value, termIndex, codes)
  }

  return { stress, stressWith, relief, pinned, applyRelief: plan.applyRelief }
}
