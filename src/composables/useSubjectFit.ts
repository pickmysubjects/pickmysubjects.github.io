import { computed, type Ref } from 'vue'
import { hasFitProfile, heldMajorIds, recommend, studyYear, subjectDifficulty, subjectFit, yearLevel, type Dataset, type Exclusion, type Profile, type RecommendOptions, type SubjectFit } from '@/engine'
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
    maxLevel: yearLevel(profile.value.results, data.value, profile.value.credit),
    programme: {
      courseYear: plan.setup.value.courseYear,
      components: heldMajorIds(plan.plan.value).filter((id): id is string => !!id),
      minors: plan.setup.value.minors ?? [],
    },
    startHere: true,
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
  const card = computed(() => (hasProfile.value ? cardFit(data.value, profile.value, options.value, code.value, year.value) : null))
  const fit = computed(() => card.value?.fit ?? null)
  const ahead = computed(() => card.value?.ahead ?? aheadOf(data.value, options.value, code.value))
  // A graduate subject (level 9) counts as a final-year one: never "taken in year 9".
  const graduate = computed(() => (data.value.subjects[code.value]?.level ?? 1) > 3)
  return { difficulty, hasProfile, fit, course, ahead, graduate }
}

/** The level the year cap lifts to for a later-year subject (see cardFit), or null. */
function aheadOf(data: Dataset, options: RecommendOptions, code: string): number | null {
  // A graduate subject (level 9) counts as a final-year (level 3) one.
  const level = studyYear(data.subjects[code]?.level ?? 1)
  return options.maxLevel !== undefined && level > options.maxLevel ? level : null
}

/**
 * The fit card's answer for one subject, from the "sort for me" options: the whole list as Find
 * subjects builds it (so betterThan compares against the same options), then the subject's place.
 * A student planning their whole degree looks up later-year subjects too: the year cap lifts to
 * the subject's own level, so it is judged as the student would meet it then. Shared by the
 * subject page's card and the shortlist's compare table, so the two never disagree.
 */
export function cardFit(data: Dataset, profile: Profile, options: RecommendOptions, code: string, year: number): { fit: SubjectFit; ahead: number | null } {
  const ahead = aheadOf(data, options, code)
  const cardOptions: RecommendOptions = ahead ? { ...options, maxLevel: ahead } : options
  const skipped = new Map<string, Exclusion>()
  const recs = recommend(data, profile, { ...cardOptions, skipped })
  return { fit: subjectFit(data, profile, cardOptions, code, { year, recs, skipped }), ahead }
}
