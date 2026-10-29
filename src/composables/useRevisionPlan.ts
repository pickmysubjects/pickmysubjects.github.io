import { computed } from 'vue'
import { latestDataYear, subjectDifficulty } from '@/engine'
import {
  addDays,
  cleanRevisionStore,
  defaultStart,
  emptyRevision,
  emptyRevisionStore,
  planRevision,
  revisionTerms,
  termKey,
  type RevisionDifficulty,
  type RevisionState,
  type RevisionStore,
  type RevisionSubject,
} from '@/engine/revisionPlan'
import { summariseAssessment } from '@/utils/assessment'
import { KEY_DATES, melbourneToday } from '@/utils/keyDates'
import { currentTerms } from '@/utils/whatsNext'
import { useDataset } from './useDataset'
import { usePersisted } from './usePersisted'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'

/** Where the revision planner keeps its inputs (this device only; part of the backup file). */
export const REVISION_KEY = 'sc:revision'

/**
 * The revision planner's state, one saved plan per exam period. It reads the plan and the record
 * to list the periods and fill in each one's subjects, and never writes to either.
 */
export function useRevisionPlan() {
  const { data } = useDataset()
  const { terms: planTerms, course } = usePlan()
  const { profile } = useProfile()
  const store = usePersisted<RevisionStore>(REVISION_KEY, emptyRevisionStore(), cleanRevisionStore)
  const today = melbourneToday()

  const known = (code: string) => data.value.subjects[code] !== undefined
  /** Exam periods from the plan, plus the term under way today from the record. */
  const periods = computed(() => {
    const now = new Set(currentTerms(KEY_DATES, today).map((x) => termKey({ year: x.year, period: x.term })))
    const recorded = profile.value.results
      .filter((r) => r.year !== undefined && r.period && now.has(termKey({ year: r.year, period: r.period })))
      .map((r) => ({ year: r.year!, period: r.period!, subjects: [r.code] }))
    const all = [...planTerms.value, ...recorded].map((t) => ({ ...t, subjects: t.subjects.filter(known) }))
    return revisionTerms(all, KEY_DATES, today)
  })
  /** The period shown: the one picked, else the first one with exams ahead. */
  const term = computed(() => periods.value.find((p) => termKey(p) === store.value.term) ?? periods.value[0] ?? null)
  const key = computed(() => (term.value ? termKey(term.value) : 'none'))
  const window = computed(() => term.value?.window ?? null)

  /** This period's saved inputs; a copy saved before periods were kept apart goes to the first one opened. */
  // Only the default period takes the old copy: it was made for the term at hand, not a later one.
  const saved = computed<RevisionState>(() => store.value.terms[key.value] ?? (term.value === periods.value[0] ? store.value.terms.legacy : undefined) ?? emptyRevision())
  function write(next: RevisionState): void {
    const terms = { ...store.value.terms, [key.value]: next }
    if (term.value === periods.value[0]) delete terms.legacy
    store.value = { ...store.value, terms }
  }
  function pick(k: string): void {
    store.value = { ...store.value, term: k }
  }

  const fromPlan = computed(() => term.value?.subjects ?? [])
  /** The subjects shown: the student's own list once they change it, else the period's. */
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
  /** No final exam: what the student said, else what the data says (0%). */
  const noExam = (r: RevisionState['subjects'][number]) => r.noExam ?? examShare(r.code) === 0

  const subjects = computed<RevisionSubject[]>(() =>
    rows.value.map((r) => {
      const share = examShare(r.code)
      return { code: r.code, exam: r.exam, ...(r.time ? { time: r.time } : {}), difficulty: r.difficulty ?? estimate(r.code), ...(share !== undefined ? { examWeight: share } : {}), ...(noExam(r) ? { noExam: true } : {}) }
    }),
  )
  // A saved start outside this period (left from an earlier year) falls back to the default.
  const start = computed(() => {
    const s = saved.value.start
    const w = window.value
    if (s && s >= today && (!w || s <= w.end)) return s
    // An intensive's exam before the usual window: start two weeks before it instead.
    const first = subjects.value.filter((x) => !x.noExam && x.exam > today).map((x) => x.exam).sort()[0]
    const def = defaultStart(w, today)
    return first && first <= def ? (addDays(first, -14) > today ? addDays(first, -14) : today) : def
  })
  const plan = computed(() => planRevision({ subjects: subjects.value, start: start.value, hoursPerDay: saved.value.hoursPerDay, restWeekdays: saved.value.restWeekdays }))
  /** Exam dates a student can pick: within the period's exam window, never before today. */
  const examMin = computed(() => (window.value && window.value.earliest > today ? window.value.earliest : today))
  const examMax = computed(() => window.value?.end ?? '')

  function setRows(next: RevisionState['subjects']): void {
    write({ ...saved.value, subjects: next, edited: true })
  }
  function patch(code: string, change: Partial<RevisionState['subjects'][number]>): void {
    if (saved.value.edited) {
      setRows(saved.value.subjects.map((s) => (s.code === code ? { ...s, ...change } : s)))
      return
    }
    // Still the period's list: keep the typed details beside it without taking it over.
    const others = saved.value.subjects.filter((s) => s.code !== code)
    const current = rows.value.find((s) => s.code === code) ?? { code, exam: '' }
    write({ ...saved.value, subjects: [...others, { ...current, ...change }] })
  }

  return {
    saved,
    rows,
    subjects,
    prefilled,
    today,
    start,
    plan,
    periods,
    term,
    key,
    window,
    examMin,
    examMax,
    pick,
    estimate,
    examShare,
    noExam,
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
    setNoExam(code: string, value: boolean) {
      patch(code, { noExam: value })
    },
    set<K extends 'start' | 'hoursPerDay' | 'dayStart' | 'restWeekdays'>(key: K, value: RevisionState[K]) {
      write({ ...saved.value, [key]: value })
    },
  }
}
