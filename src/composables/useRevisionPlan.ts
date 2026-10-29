import { computed } from 'vue'
import { latestDataYear, PERIODS, subjectDifficulty } from '@/engine'
import { cleanRevision, emptyRevision, planRevision, type RevisionDifficulty, type RevisionState, type RevisionSubject } from '@/engine/revisionPlan'
import { summariseAssessment } from '@/utils/assessment'
import { KEY_DATES, melbourneToday } from '@/utils/keyDates'
import { myTerm } from '@/utils/whatsNext'
import { useDataset } from './useDataset'
import { usePersisted } from './usePersisted'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'

/** Where the revision planner keeps its inputs (this device only; part of the backup file). */
export const REVISION_KEY = 'sc:revision'

/**
 * The revision planner's state. It reads the plan and the record to fill in the subjects, and
 * never writes to either: everything typed here stays under its own key.
 */
export function useRevisionPlan() {
  const { data } = useDataset()
  const { terms: planTerms, course } = usePlan()
  const { profile } = useProfile()
  const saved = usePersisted<RevisionState>(REVISION_KEY, emptyRevision(), cleanRevision)
  const today = melbourneToday()

  const known = (code: string) => data.value.subjects[code] !== undefined
  /** The current semester's subjects, else the next planned semester that hasn't had its exams. */
  const fromPlan = computed<string[]>(() => {
    const now = myTerm(KEY_DATES, today, planTerms.value, profile.value.results, known)
    if (now) return now.subjects
    const year = Number(today.slice(0, 4))
    const next = [...planTerms.value]
      .filter((t) => t.subjects.some(known))
      .filter((t) => {
        const exams = KEY_DATES.find((d) => d.kind === 'exams' && d.year === t.year && d.term === t.period)
        return exams ? exams.end >= today : t.year > year || (t.year === year && PERIODS.indexOf(t.period) >= 2)
      })
      .sort((a, b) => a.year - b.year || PERIODS.indexOf(a.period) - PERIODS.indexOf(b.period))[0]
    return next ? next.subjects.filter(known) : []
  })

  /** The subjects shown: the student's own list once they change it, else the plan's. */
  const rows = computed(() => (saved.value.edited ? saved.value.subjects : fromPlan.value.map((code) => saved.value.subjects.find((s) => s.code === code) ?? { code, exam: '' })))
  const prefilled = computed(() => !saved.value.edited && fromPlan.value.length > 0)

  const year = computed(() => latestDataYear(data.value.subjects))
  /** Our difficulty estimate, from the same data as the subject page. */
  const estimate = (code: string): RevisionDifficulty => {
    const level = subjectDifficulty(data.value.subjects, code, course.value?.code ?? '', year.value).level
    return level === 'easier' || level === 'harder' ? level : 'average'
  }
  /** The final exam's share of the mark, when the data has the assessment. */
  const examShare = (code: string): number | undefined => summariseAssessment(data.value.subjects[code]?.assessment)?.exam

  const subjects = computed<RevisionSubject[]>(() =>
    rows.value.map((r) => {
      const share = examShare(r.code)
      return { code: r.code, exam: r.exam, ...(r.time ? { time: r.time } : {}), difficulty: r.difficulty ?? estimate(r.code), ...(share !== undefined ? { examWeight: share } : {}) }
    }),
  )
  const start = computed(() => saved.value.start || today)
  const plan = computed(() => planRevision({ subjects: subjects.value, start: start.value, hoursPerDay: saved.value.hoursPerDay, restWeekdays: saved.value.restWeekdays }))

  /** Changes the list: from now on it's the student's own (the plan no longer fills it). */
  function setRows(next: RevisionState['subjects']): void {
    saved.value = { ...saved.value, subjects: next, edited: true }
  }
  function patch(code: string, change: Partial<RevisionState['subjects'][number]>): void {
    if (saved.value.edited) {
      setRows(saved.value.subjects.map((s) => (s.code === code ? { ...s, ...change } : s)))
      return
    }
    // Still the plan's list: keep the typed details beside it without taking it over.
    const others = saved.value.subjects.filter((s) => s.code !== code)
    const current = rows.value.find((s) => s.code === code) ?? { code, exam: '' }
    saved.value = { ...saved.value, subjects: [...others, { ...current, ...change }] }
  }

  return {
    saved,
    rows,
    subjects,
    prefilled,
    today,
    start,
    plan,
    estimate,
    examShare,
    add(code: string) {
      if (!known(code) || rows.value.some((r) => r.code === code)) return
      setRows([...rows.value, { code, exam: '' }])
    },
    remove(code: string) {
      setRows(rows.value.filter((r) => r.code !== code))
    },
    setExam(code: string, exam: string) {
      patch(code, { exam })
    },
    setTime(code: string, time: string) {
      patch(code, time ? { time } : { time: undefined })
    },
    setDifficulty(code: string, difficulty: RevisionDifficulty) {
      patch(code, { difficulty })
    },
    set<K extends 'start' | 'hoursPerDay' | 'dayStart' | 'restWeekdays'>(key: K, value: RevisionState[K]) {
      saved.value = { ...saved.value, [key]: value }
    },
  }
}
