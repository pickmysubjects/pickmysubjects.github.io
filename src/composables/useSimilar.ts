import { computed, type Ref } from 'vue'
import { passedCodes, similarSubjects, type Subject } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'

/** A short list to compare with, or take instead: see similarSubjects. Done subjects are left out. */
export function useSimilar(subject: Ref<Subject | undefined>, year: Ref<number>) {
  const { data } = useDataset()
  const { profile } = useProfile()
  const plan = usePlan()
  const done = computed(() => new Set([...passedCodes(profile.value.results), ...plan.plan.value.completed]))
  return computed(() => (subject.value ? similarSubjects(subject.value, data.value.subjects, year.value, done.value) : []))
}
