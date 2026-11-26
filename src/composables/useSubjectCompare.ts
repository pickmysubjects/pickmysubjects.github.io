import { viewYear } from '@/engine/dataYear'
import { computed, type Ref } from 'vue'
import {
  hasFitProfile,
  recommend,
  studyYear,
  subjectFit,
  periodsFor,
  prereqStatus,
  simplifyFor,
  standingOf,
  subjectDifficulty,
  type Difficulty,
  type Exclusion,
  type Recommendation,
  type SubjectFit,
  type Period,
  type ReqField,
  type Subject,
  type Tri,
} from '@/engine'
import { useDataset } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'
import { useSortForMeOptions } from './useSubjectFit'

/** One saved subject's row on the shortlist: the same answers its own page gives. */
export interface CompareColumn {
  subject: Subject
  /** The subject page's difficulty verdict for the plan's degree. */
  difficulty: Difficulty
  /** Final exam share; null when the assessment isn't recorded. */
  exam: number | null
  /** Hurdle tasks; null when the assessment isn't recorded. */
  hurdles: number | null
  periods: Period[]
  /** Its prerequisites for the plan's degree, as the subject page's facts read them. */
  needs: ReqField
  /** 'none' when it needs nothing first; otherwise whether the student's record meets it. */
  prereq: 'none' | Tri
  /** How many students rated it. */
  reviews: number
  /** How it fits the student, as its subject page's card says; null without a profile. */
  fit: SubjectFit | null
}

/**
 * The facts of a few subjects for the plan's degree and year, each worked out as the subject's own
 * page works it out, so a saved subject never shows a different answer here.
 */
export function useSubjectCompare(codes: Ref<string[]>) {
  const { data, course: listCourse } = useDataset()
  const { profile } = useProfile()
  const plan = usePlan()
  // As the subject page: the plan's degree (else the one the data shows) and first planned year.
  const course = computed(() => plan.setup.value.course || listCourse.value)
  const year = computed(() => viewYear(plan.terms.value[0]?.year))

  const options = useSortForMeOptions()
  const hasProfile = computed(() => hasFitProfile(profile.value))
  // The subject card's answer (cardFit): the "sort for me" list, with the year cap lifted to a
  // later-year subject's own level. One recommend() run per cap, shared by the rows that need it.
  const fitRuns = computed(() => {
    const runs = new Map<number | undefined, { recs: Recommendation[]; skipped: Map<string, Exclusion> }>()
    return (maxLevel: number | undefined) => {
      let run = runs.get(maxLevel)
      if (!run) {
        const skipped = new Map<string, Exclusion>()
        run = { recs: recommend(data.value, profile.value, { ...options.value, maxLevel, skipped }), skipped }
        runs.set(maxLevel, run)
      }
      return run
    }
  })
  function fitOf(s: Subject): SubjectFit | null {
    if (!hasProfile.value) return null
    const level = studyYear(s.level)
    const cap = options.value.maxLevel !== undefined && level > options.value.maxLevel ? level : options.value.maxLevel
    const run = fitRuns.value(cap)
    return subjectFit(data.value, profile.value, { ...options.value, maxLevel: cap }, s.code, { year: year.value, recs: run.recs, skipped: run.skipped })
  }

  const columns = computed<CompareColumn[]>(() =>
    codes.value
      .map((code) => data.value.subjects[code])
      .filter((s): s is Subject => s !== undefined)
      .map((s) => column(s)),
  )

  function column(s: Subject): CompareColumn {
    const tasks = s.assessment
    const needs = simplifyFor(s.prerequisites, course.value)
    // Checked as the subject page and Find subjects check it: done, credit, planned and confirmed.
    const standing = standingOf(profile.value, data.value, plan.plannedCodes.value)
    return {
      subject: s,
      difficulty: subjectDifficulty(data.value.subjects, s.code, course.value, year.value),
      exam: tasks?.length ? Math.round(tasks.filter((x) => x.kind === 'exam').reduce((a, x) => a + x.weight, 0)) : null,
      hurdles: tasks?.length ? tasks.filter((x) => x.hurdle).length : null,
      periods: periodsFor(s, year.value),
      needs,
      prereq:
        needs === 'none'
          ? 'none'
          : prereqStatus(s, standing, { subjects: data.value.subjects, course: course.value }).status,
      reviews: s.signals?.reviews ?? 0,
      fit: fitOf(s),
    }
  }

  return { columns, course, year, hasProfile }
}
