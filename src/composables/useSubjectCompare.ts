import { computed, type Ref } from 'vue'
import {
  exactWam,
  evaluateField,
  hasFitProfile,
  isFail,
  marksForConditions,
  periodsFor,
  simplifyFor,
  subjectDifficulty,
  type Difficulty,
  type Period,
  type Subject,
  type SubjectFit,
  type Tri,
} from '@/engine'
import { useDataset } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'
import { cardFit, useSortForMeOptions } from './useSubjectFit'

/** One subject's column in the compare table: the same answers its own page gives. */
export interface CompareColumn {
  subject: Subject
  /** The subject page's difficulty verdict for the plan's degree. */
  difficulty: Difficulty
  /** The fit card's answer (null until the student has a profile). */
  fit: SubjectFit | null
  /** Weight per assessment kind, biggest first; null when the assessment isn't recorded. */
  assessment: { kind: string; weight: number }[] | null
  /** Final exam share; null when the assessment isn't recorded. */
  exam: number | null
  /** Class hours a week, else what students report (with 3+ ratings); null when neither. */
  hours: { n: number; reported: boolean } | null
  periods: Period[]
  /** 'none' when it needs nothing first; otherwise whether the student's record meets it. */
  prereq: 'none' | Tri
  ratings: { reviews: number; overall?: number; recommend?: number } | null
  /** Its category in the plan's degree ('closed' when closed to new students of it). */
  category: string | undefined
}

/**
 * Side-by-side facts for a few subjects, for the plan's degree and year. Fit comes from cardFit,
 * the subject page's own computation, so a compared subject never shows a different answer.
 */
export function useSubjectCompare(codes: Ref<string[]>) {
  const { data, course: listCourse } = useDataset()
  const { profile } = useProfile()
  const options = useSortForMeOptions()
  const plan = usePlan()
  // As the subject page: the plan's degree (else the one the data shows) and first planned year.
  const course = computed(() => plan.setup.value.course || listCourse.value)
  const year = computed(() => plan.terms.value[0]?.year ?? new Date().getFullYear())
  const hasProfile = computed(() => hasFitProfile(profile.value))

  const columns = computed<CompareColumn[]>(() =>
    codes.value
      .map((code) => data.value.subjects[code])
      .filter((s): s is Subject => s !== undefined)
      .map((s) => column(s)),
  )

  function column(s: Subject): CompareColumn {
    const tasks = s.assessment
    const byKind = new Map<string, number>()
    for (const task of tasks ?? []) byKind.set(task.kind, (byKind.get(task.kind) ?? 0) + task.weight)
    const needs = simplifyFor(s.prerequisites, course.value)
    const passed = profile.value.results.filter((r) => !isFail(r))
    // As the plan and suggestions read them: each subject's best attempt (pass/fail ones have no
    // mark), and the WAM over every attempt.
    const marks = marksForConditions(profile.value.results, data.value)
    const wam = exactWam(profile.value.results, data.value)
    const sig = s.signals
    const closed = data.value.courses.some((c) => c.code === course.value && c.closed.includes(s.code))
    return {
      subject: s,
      difficulty: subjectDifficulty(data.value.subjects, s.code, course.value, year.value),
      fit: hasProfile.value ? cardFit(data.value, profile.value, options.value, s.code, year.value).fit : null,
      assessment: tasks?.length ? [...byKind].map(([kind, w]) => ({ kind, weight: Math.round(w) })).sort((a, b) => b.weight - a.weight) : null,
      exam: tasks?.length ? Math.round(tasks.filter((x) => x.kind === 'exam').reduce((a, x) => a + x.weight, 0)) : null,
      hours: s.weeklyContactHours
        ? { n: s.weeklyContactHours, reported: false }
        : sig?.hours && sig.reviews >= 3
          ? { n: sig.hours, reported: true }
          : null,
      periods: periodsFor(s, year.value),
      prereq:
        needs === 'none'
          ? 'none'
          : evaluateField(needs, { completed: new Set(passed.map((r) => r.code)), subjects: data.value.subjects, admittedCourse: course.value, marks, wam }).status,
      ratings: sig && sig.reviews > 0 ? { reviews: sig.reviews, overall: sig.overall, recommend: sig.recommend } : null,
      category: closed ? 'closed' : s.categories[course.value],
    }
  }

  return { columns, course, year, hasProfile }
}
