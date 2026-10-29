import { viewYear } from '@/engine/dataYear'
import { computed, type Ref } from 'vue'
import {
  exactWam,
  evaluateField,
  isFail,
  marksForConditions,
  periodsFor,
  simplifyFor,
  subjectDifficulty,
  type Difficulty,
  type Period,
  type ReqField,
  type Subject,
  type Tri,
} from '@/engine'
import { useDataset } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'

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

  const columns = computed<CompareColumn[]>(() =>
    codes.value
      .map((code) => data.value.subjects[code])
      .filter((s): s is Subject => s !== undefined)
      .map((s) => column(s)),
  )

  function column(s: Subject): CompareColumn {
    const tasks = s.assessment
    const needs = simplifyFor(s.prerequisites, course.value)
    const passed = profile.value.results.filter((r) => !isFail(r))
    // As the plan and suggestions read them: each subject's best attempt (pass/fail ones have no
    // mark), and the WAM over every attempt.
    const marks = marksForConditions(profile.value.results, data.value)
    const wam = exactWam(profile.value.results, data.value)
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
          : evaluateField(needs, { completed: new Set(passed.map((r) => r.code)), subjects: data.value.subjects, admittedCourse: course.value, marks, wam }).status,
      reviews: s.signals?.reviews ?? 0,
    }
  }

  return { columns, course, year }
}
