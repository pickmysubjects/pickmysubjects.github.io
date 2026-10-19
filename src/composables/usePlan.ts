import { computed } from 'vue'
import {
  checkCourse,
  checkTerms,
  findCourse,
  generatePlan,
  offeredIn,
  referencedSubjects,
  passedCodes,
  planStart,
  termKey,
  standardTerms,
  type Dataset,
  type Period,
  type Plan,
  type PlanTerm,
  type Note,
  defaultCourse,
  type Relief,
  type Profile,
} from '@/engine'
import { activePlan, books, type PlanSetup, type PlanState, type SavedPlan } from './planStore'
import { bookOf, planBody } from '@/utils/planBook'
import { useDataset } from './useDataset'
import { useProfile } from './useProfile'
import { cloneJson } from '@/utils/clone'
import { defaultState } from './planDefaults'

export { defaultState } from './planDefaults'
import { majorGroupOf } from '@/utils/majorGroups'

export type { PlanSetup } from './planStore'

/** Points on the record per semester, passed or failed (enrolled either way). */
function recordedLoad(results: { code: string; year?: number; period?: string }[], subjects: Dataset['subjects']): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of results) {
    if (r.year === undefined || r.period === undefined) continue
    const key = `${r.year}|${r.period}`
    out[key] = (out[key] ?? 0) + (subjects[r.code]?.points ?? 12.5)
  }
  return out
}

/** A saved plan as the engine reads it, with the student's record (shared by every plan). */
export function planFor(state: PlanState, profile: Profile, data: Dataset): Plan {
  return {
    course: state.setup.course,
    courseYear: state.setup.courseYear,
    major: state.setup.major || undefined,
    specialisation: state.setup.specialisation || undefined,
    minors: state.setup.minors ?? [],
    completed: passedCodes(profile.results),
    terms: state.terms,
    international: state.setup.international === true,
    confirmed: profile.confirmed ?? [],
    recordedLoad: recordedLoad(profile.results, data.subjects),
    marks: Object.fromEntries(profile.results.filter((r) => r.mark !== undefined).map((r) => [r.code, r.mark as number])),
  }
}

export function usePlan() {
  const { name, data } = useDataset()
  const { profile } = useProfile()

  // The open plan (Plan A, B…); the others wait in the book.
  const current = computed<SavedPlan | undefined>(() => activePlan(books.value[name.value]))
  // No plan yet: the empty terms start where the default setup does (the next semester).
  const state = computed<PlanState>(() => current.value ?? defaultState(data.value))

  const plan = computed<Plan>(() => planFor(state.value, profile.value, data.value))

  const course = computed(() => findCourse(data.value, plan.value.course, plan.value.courseYear))
  const termIssues = computed(() => checkTerms(plan.value, data.value, course.value?.standardLoad))
  const courseCheck = computed(() => checkCourse(plan.value, data.value))
  const plannedCodes = computed(() => state.value.terms.flatMap((t) => t.subjects))
  const isEmpty = computed(() => plannedCodes.value.length === 0)
  // Answered the questions, or built a plan with them before this was recorded (it left notes).
  const setupChosen = computed(() => state.value.setup.confirmed === true || state.value.notes.length > 0)

  /** Write the open plan (its body, and the plans for other degrees it keeps aside). */
  function put(body: PlanState, kept = current.value?.kept): void {
    const book = books.value[name.value] ?? bookOf(state.value)
    const id = activePlan(book)!.id
    const plans = book.plans.map((p) => {
      if (p.id !== id) return p
      const { kept: _old, ...meta } = p
      return { ...meta, ...planBody(body), ...(kept && Object.keys(kept).length ? { kept } : {}) }
    })
    books.value = { ...books.value, [name.value]: { active: id, plans } }
  }

  function save(change: (s: PlanState) => PlanState): void {
    put(change(cloneJson(planBody(state.value))))
  }

  /**
   * Answers to the setup questions. Switching degree keeps the old degree's plan aside, so going
   * back finds it again: true when that plan was put back as it was (no rebuild needed).
   */
  function updateSetup(setup: PlanSetup): boolean {
    const old = planBody(state.value)
    if (setup.course !== old.setup.course) {
      const built = (p: PlanState | undefined) => p !== undefined && p.terms.some((t) => t.subjects.length > 0)
      // Only a plan that was actually built is worth keeping (not the untouched default).
      const kept = { ...(current.value?.kept ?? {}), ...(built(old) ? { [old.setup.course]: cloneJson(old) } : {}) }
      const back = kept[setup.course]
      delete kept[setup.course]
      const same = (a: PlanSetup, b: PlanSetup) =>
        a.courseYear === b.courseYear &&
        a.major === b.major &&
        a.specialisation === b.specialisation &&
        (a.minors ?? []).join(',') === (b.minors ?? []).join(',') &&
        (a.field ?? '') === (b.field ?? '') &&
        a.startYear === b.startYear &&
        a.startPeriod === b.startPeriod &&
        (a.international === true) === (b.international === true)
      if (back && built(back) && same(back.setup, setup)) {
        put({ ...back, setup: { ...setup, confirmed: true } }, kept)
        return true
      }
      put(old, kept)
    }
    save((s) => ({ ...s, setup: { ...setup, confirmed: true } }))
    return false
  }

  // A part-done semester on the record is carried on in (its done subjects share the column).
  function startFill() {
    return {
      // Enrolled points, a fail included: the semester was that full either way.
      pointsOf: (c: string) => data.value.subjects[c]?.points ?? 12.5,
      load: course.value?.standardLoad ?? 50,
    }
  }

  function generate(): void {
    const { setup } = state.value
    // Students who started already are planned from the next semester on; what
    // they've done comes from their record.
    const start = planStart({ year: setup.startYear, period: setup.startPeriod }, profile.value.results, startFill())
    const result = generatePlan({
      data: data.value,
      profile: profile.value,
      course: setup.course,
      courseYear: setup.courseYear,
      major: setup.major || undefined,
      specialisation: setup.specialisation || undefined,
      minors: setup.minors ?? [],
      startYear: start.year,
      startPeriod: start.period,
      keepOpen: !setup.major && setup.field
        ? data.value.components.filter((c) => c.kind === 'major' && c.course === setup.course && majorGroupOf(c.id) === setup.field && (c.closedFrom === undefined || start.year < c.closedFrom)).map((c) => c.id)
        : undefined,
    })
    save((s) => ({ ...s, terms: result.plan.terms, notes: result.notes, unplaced: result.unplaced }))
  }

  function startEmpty(): void {
    const { setup } = state.value
    const start = planStart({ year: setup.startYear, period: setup.startPeriod }, profile.value.results, startFill())
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

  /**
   * Take `to` instead of `from` (two subjects that stand in for each other). Where `to` runs and
   * there's room, before every planned subject that needs it: `from`'s own term first, then the
   * nearest. A full term can trade one of its free electives into `from`'s old place, if that
   * elective runs there. Returns where `to` went, or null if nowhere works.
   */
  function swapSubject(from: string, to: string): { year: number; period: Period } | null {
    const terms = state.value.terms
    const at = terms.findIndex((t) => t.subjects.includes(from))
    const subject = data.value.subjects[to]
    if (at < 0 || !subject) return null
    const pts = (c: string) => data.value.subjects[c]?.points ?? 12.5
    const load = course.value?.standardLoad ?? 50
    // It has to come before anything planned that lists `from` or `to` as a prerequisite.
    const needers = terms.flatMap((t, i) =>
      t.subjects.filter((c) => {
        const refs = referencedSubjects(data.value.subjects[c]?.prerequisites ?? 'none')
        return refs.includes(from) || refs.includes(to)
      }).map(() => i),
    )
    const deadline = needers.length ? Math.min(...needers) : terms.length
    // Free to trade: not needed before something else in the plan.
    const free = (c: string) => !terms.some((t) => t.subjects.some((x) => referencedSubjects(data.value.subjects[x]?.prerequisites ?? 'none').includes(c)))
    const order = terms.map((_, i) => i).filter((i) => i < deadline).sort((x, y) => Math.abs(x - at) - Math.abs(y - at) || x - y)
    for (const i of order) {
      const t = terms[i]!
      if (offeredIn(subject, t.year, t.period).status === 'fail') continue
      const others = t.subjects.filter((c) => c !== from && c !== to)
      const used = others.reduce((sum, c) => sum + pts(c), 0)
      let trade: string | undefined
      if (used + subject.points > load) {
        const home = terms[at]!
        trade = others.find((c) => free(c) && pts(c) === subject.points && data.value.subjects[c] && offeredIn(data.value.subjects[c]!, home.year, home.period).status !== 'fail')
        if (!trade) continue
      }
      save((s) => {
        const target = s.terms[i]!
        const home = s.terms[at]!
        for (const x of s.terms) if (x !== target) x.subjects = x.subjects.filter((c) => c !== to)
        if (target === home) target.subjects = target.subjects.filter((c) => c !== to).map((c) => (c === from ? to : c))
        else {
          home.subjects = home.subjects.map((c) => (c === from ? (trade ?? '') : c)).filter(Boolean)
          target.subjects = target.subjects.map((c) => (c === trade ? to : c))
          if (!trade) target.subjects.push(to)
        }
        return s
      })
      return { year: t.year, period: t.period }
    }
    return null
  }

  function removeSubject(termIndex: number, code: string): void {
    save((s) => {
      const term = s.terms[termIndex]
      if (term) term.subjects = term.subjects.filter((c) => c !== code)
      // A summer or winter term left empty goes too: it was there for that subject.
      if (term && term.subjects.length === 0 && (term.period === 'summer' || term.period === 'winter')) s.terms.splice(termIndex, 1)
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
        : (() => {
            // No semesters yet: the one after the record (or the start of study).
            const from = planStart({ year: s.setup.startYear, period: s.setup.startPeriod }, profile.value.results, startFill())
            return standardTerms(from.year, from.period, 1)[0]
          })()
      if (next) s.terms.push({ ...next, subjects: [] })
      return s
    })
  }

  /** Insert an empty term (e.g. a summer or winter term) in date order. */
  function addTermAt(year: number, period: Period): void {
    save((s) => {
      if (s.terms.some((t) => t.year === year && t.period === period)) return s
      const at = s.terms.findIndex((t) => termKey(t.year, t.period) > termKey(year, period))
      s.terms.splice(at < 0 ? s.terms.length : at, 0, { year, period, subjects: [] })
      return s
    })
  }

  /** Remove a term, only if it's empty. */
  function removeTerm(index: number): void {
    save((s) => {
      if ((s.terms[index]?.subjects.length ?? 1) === 0 && s.terms.length > 1) s.terms.splice(index, 1)
      return s
    })
  }

  /** Take a plan someone shared (setup and terms); this replaces the current one. */
  function importPlan(setup: PlanSetup, terms: PlanTerm[]): void {
    // Whether you're on a student visa is about you, not the plan: a shared link keeps yours.
    const international = state.value.setup.international
    save(() => ({ setup: { ...setup, ...(international !== undefined ? { international } : {}) }, terms, notes: [], unplaced: [] }))
  }

  /** Make a heavy semester lighter: take the spread-out arrangement, or move one subject to a summer/winter term. */
  function applyRelief(termIndex: number, relief: Relief): void {
    save((s) => {
      if (relief.kind === 'spread' || relief.kind === 'replace') {
        s.terms = cloneJson(relief.terms)
        return s
      }
      const from = s.terms[termIndex]
      if (!from) return s
      from.subjects = from.subjects.filter((c) => c !== relief.code)
      let term = s.terms.find((t) => t.year === relief.year && t.period === relief.period)
      if (!term) {
        term = { year: relief.year, period: relief.period, subjects: [] }
        const at = s.terms.findIndex((t) => termKey(t.year, t.period) > termKey(relief.year, relief.period))
        s.terms.splice(at < 0 ? s.terms.length : at, 0, term)
      }
      term.subjects.push(relief.code)
      return s
    })
  }

  function removeLastTerm(): void {
    save((s) => {
      // Any empty last term, even the only one (a finished degree needs none).
      if (s.terms.length > 0 && (s.terms.at(-1)?.subjects.length ?? 1) === 0) s.terms.pop()
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
    setupChosen,
    updateSetup,
    generate,
    startEmpty,
    addSubject,
    addSubjectAt,
    removeSubject,
    swapSubject,
    moveSubject,
    addTerm,
    addTermAt,
    removeTerm,
    removeLastTerm,
    applyRelief,
    importPlan,
  }
}
