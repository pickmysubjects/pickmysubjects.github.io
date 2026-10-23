import { computed, type Ref } from 'vue'
import { hasFitProfile, heldMajorIds, recommend, subjectDifficulty, subjectFit, yearLevel, type Exclusion, type RecommendOptions } from '@/engine'
import { useDataset } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'

/**
 * The options Find subjects' "sort for me" passes to recommend(): the open plan's degree,
 * planned subjects, major and minors, and the student's year from their record. Shared, so the
 * subject page's fit card reads the very same list.
 */
export function useSortForMeOptions() {
  const { data } = useDataset()
  const { profile } = useProfile()
  const plan = usePlan()
  return computed<RecommendOptions>(() => ({
    planned: plan.plannedCodes.value,
    course: plan.setup.value.course,
    maxLevel: yearLevel(profile.value.results, data.value),
    programme: {
      courseYear: plan.setup.value.courseYear,
      components: heldMajorIds(plan.plan.value).filter((id): id is string => !!id),
      minors: plan.setup.value.minors ?? [],
    },
  }))
}

/**
 * The subject page's card: how hard `code` is (the easy/hard lists, as the header chip reads
 * them) and, once the open plan has a profile, how it fits (the "sort for me" list).
 */
export function useSubjectFit(code: Ref<string>, year: Ref<number>) {
  const { data, course: listCourse } = useDataset()
  const { profile } = useProfile()
  const options = useSortForMeOptions()
  const plan = usePlan()
  // One degree for both halves: the plan's (as "sort for me" uses), else the one the data shows.
  const course = computed(() => plan.setup.value.course || listCourse.value)

  const difficulty = computed(() => subjectDifficulty(data.value.subjects, code.value, course.value, year.value))
  const hasProfile = computed(() => hasFitProfile(profile.value))
  // The whole list (as Find subjects builds it), so betterThan compares against the same options.
  const list = computed(() => {
    if (!hasProfile.value) return null
    const skipped = new Map<string, Exclusion>()
    return { recs: recommend(data.value, profile.value, { ...options.value, skipped }), skipped }
  })
  const fit = computed(() => {
    const l = list.value
    return l ? subjectFit(data.value, profile.value, options.value, code.value, { year: year.value, ...l }) : null
  })
  return { difficulty, hasProfile, fit, course }
}
