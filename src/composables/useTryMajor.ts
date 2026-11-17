import { computed } from 'vue'
import { usePlans } from './usePlans'
import { go } from './useView'

/**
 * Same plan, another major: a copy of the open plan (the record is shared) with the questions
 * open at the major; once built, both plans open side by side (PlannerView, ?switch=). Offered
 * once the plan has its questions answered and there's room for another plan.
 */
export function useTryMajor() {
  const plans = usePlans()
  const canTry = computed(() => plans.canAdd.value && (plans.active.value.setup.confirmed === true || plans.active.value.notes.length > 0))
  function tryMajor(): void {
    const from = plans.active.value.label
    plans.create('copy')
    go(`plan/?switch=${from}`)
  }
  return { canTry, tryMajor }
}
