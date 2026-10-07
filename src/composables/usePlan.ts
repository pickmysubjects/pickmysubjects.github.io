import { computed } from 'vue'
import {
  checkCourse,
  checkTerms,
  findCourse,
  generatePlan,
  passedCodes,
  planStart,
  termKey,
  standardTerms,
  type Dataset,
  type Period,
  type Plan,
  type PlanTerm,
  type Note,
} from '@/engine'
import { useDataset } from './useDataset'
import { useProfile } from './useProfile'
import { usePersisted } from './usePersisted'
import { cloneJson } from '@/utils/clone'

export interface PlanSetup {
  course: string
  courseYear: number
  startYear: number
  startPeriod: Period
  major: string
  specialisation: string
}

interface PlanState {
  setup: PlanSetup
  terms: PlanTerm[]
  notes: Note[]
  unplaced: { code: string; reason: string; reasonKey: string }[]
}

// One saved plan per dataset.
const plans = usePersisted<Record<string, PlanState>>('sc:plans', {})

function defaultSetup(data: Dataset): PlanSetup {
  const course = data.courses[0]
  const major = data.components.find((c) => c.course === course?.code && c.kind === 'major')
  return {
    course: course?.code ?? '',
    courseYear: course?.year ?? new Date().getFullYear(),
    startYear: course?.year ?? new Date().getFullYear(),
    startPeriod: 'semester-1',
    major: major?.id ?? '',
    specialisation: '',
  }
}

export function usePlan() {
  const { name, data } = useDataset()
  const { profile } = useProfile()

  const state = computed<PlanState>(
    () =>
      plans.value[name.value] ?? {
        setup: defaultSetup(data.value),
        terms: standardTerms(data.value.courses[0]?.year ?? 2026, 'semester-1', 6),
        notes: [],
        unplaced: [],
      },
  )

  const plan = computed<Plan>(() => ({
    course: state.value.setup.course,
    courseYear: state.value.setup.courseYear,
    major: state.value.setup.major || undefined,
    specialisation: state.value.setup.specialisation || undefined,
    completed: passedCodes(profile.value.results),
    terms: state.value.terms,
  }))

  const course = computed(() => findCourse(data.value, plan.value.course, plan.value.courseYear))
  const termIssues = computed(() => checkTerms(plan.value, data.value, course.value?.standardLoad))
  const courseCheck = computed(() => checkCourse(plan.value, data.value))
  const plannedCodes = computed(() => state.value.terms.flatMap((t) => t.subjects))
  const isEmpty = computed(() => plannedCodes.value.length === 0)

  function save(change: (s: PlanState) => PlanState): void {
    plans.value = { ...plans.value, [name.value]: change(cloneJson(state.value)) }
  }

  function updateSetup(setup: PlanSetup): void {
    save((s) => ({ ...s, setup }))
  }

  function generate(): void {
    const { setup } = state.value
    // Students who started already are planned from the next semester on; what
    // they've done comes from their record.
    const start = planStart({ year: setup.startYear, period: setup.startPeriod }, new Date())
    const result = generatePlan({
      data: data.value,
      profile: profile.value,
      course: setup.course,
      courseYear: setup.courseYear,
      major: setup.major || undefined,
      specialisation: setup.specialisation || undefined,
      startYear: start.year,
      startPeriod: start.period,
    })
    save((s) => ({ ...s, terms: result.plan.terms, notes: result.notes, unplaced: result.unplaced }))
  }

  function startEmpty(): void {
    const { setup } = state.value
    const start = planStart({ year: setup.startYear, period: setup.startPeriod }, new Date())
    save((s) => ({ ...s, terms: standardTerms(start.year, start.period, 6), notes: [], unplaced: [] }))
  }

  function addSubject(termIndex: number, code: string): void {
    save((s) => {
      const term = s.terms[termIndex]
      if (term && !term.subjects.includes(code)) term.subjects.push(code)
      return s
    })
  }

  /** Add to the plan's term for that year and period, creating it (e.g. a summer term) in order if needed. */
  function addSubjectAt(year: number, period: Period, code: string): void {
    save((s) => {
      let term = s.terms.find((t) => t.year === year && t.period === period)
      if (!term) {
        term = { year, period, subjects: [] }
        const at = s.terms.findIndex((t) => termKey(t.year, t.period) > termKey(year, period))
        s.terms.splice(at < 0 ? s.terms.length : at, 0, term)
      }
      if (!term.subjects.includes(code)) term.subjects.push(code)
      return s
    })
  }

  function removeSubject(termIndex: number, code: string): void {
    save((s) => {
      const term = s.terms[termIndex]
      if (term) term.subjects = term.subjects.filter((c) => c !== code)
      return s
    })
  }

  function moveSubject(code: string, from: number, to: number): void {
    if (from === to) return
    save((s) => {
      const source = s.terms[from]
      const target = s.terms[to]
      if (!source || !target || !source.subjects.includes(code)) return s
      source.subjects = source.subjects.filter((c) => c !== code)
      if (!target.subjects.includes(code)) target.subjects.push(code)
      return s
    })
  }

  function addTerm(): void {
    save((s) => {
      // Summer/winter terms sit between semesters; the next one follows the last semester.
      const last = [...s.terms].reverse().find((t) => t.period === 'semester-1' || t.period === 'semester-2')
      const next = last
        ? standardTerms(last.year, last.period, 2)[1]
        : standardTerms(s.setup.startYear, s.setup.startPeriod, 1)[0]
      if (next) s.terms.push({ ...next, subjects: [] })
      return s
    })
  }

  function removeLastTerm(): void {
    save((s) => {
      if (s.terms.length > 1 && (s.terms.at(-1)?.subjects.length ?? 0) === 0) s.terms.pop()
      return s
    })
  }

  return {
    setup: computed(() => state.value.setup),
    terms: computed(() => state.value.terms),
    notes: computed(() => state.value.notes),
    unplaced: computed(() => state.value.unplaced),
    plan,
    course,
    termIssues,
    courseCheck,
    plannedCodes,
    isEmpty,
    updateSetup,
    generate,
    startEmpty,
    addSubject,
    addSubjectAt,
    removeSubject,
    moveSubject,
    addTerm,
    removeLastTerm,
  }
}
