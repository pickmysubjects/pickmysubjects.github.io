import { computed, type Ref } from 'vue'
import { hasFitProfile, heldMajorIds, recommend, studyYear, subjectDifficulty, subjectFit, yearLevel, type Exclusion, type RecommendOptions } from '@/engine'
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
  // A student planning their whole degree looks up later-year subjects too: on this page the
  // year cap lifts to the subject's own level, so it is judged as the student would meet it then.
  // A graduate subject (level 9) counts as a final-year one: never "taken in year 9".
  const level = computed(() => studyYear(data.value.subjects[code.value]?.level ?? 1))
  const ahead = computed(() => (options.value.maxLevel !== undefined && level.value > options.value.maxLevel ? level.value : null))
  const graduate = computed(() => (data.value.subjects[code.value]?.level ?? 1) > 3)
  const cardOptions = computed<RecommendOptions>(() => (ahead.value ? { ...options.value, maxLevel: ahead.value } : options.value))
  const list = computed(() => {
    if (!hasProfile.value) return null
    const skipped = new Map<string, Exclusion>()
    return { recs: recommend(data.value, profile.value, { ...cardOptions.value, skipped }), skipped }
  })
  const fit = computed(() => {
    const l = list.value
    return l ? subjectFit(data.value, profile.value, cardOptions.value, code.value, { year: year.value, ...l }) : null
  })
  return { difficulty, hasProfile, fit, course, ahead, graduate }
}
