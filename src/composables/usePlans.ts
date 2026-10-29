import { computed } from 'vue'
import { activePlan, books, prefsOf, type PlanBook, type PlanPrefs, type PlanSetup, type PlanState } from './planStore'
import { useProfile } from './useProfile'
import { defaultState } from './usePlan'
import { useDataset } from './useDataset'
import { addPlan, bookOf, clearPlan, MAX_PLANS, removePlan, renamePlan, switchPlan } from '@/utils/planBook'
import { cloneJson } from '@/utils/clone'
import { standardTerms, type PlanTerm } from '@/engine'

export interface PlanEntry {
  id: string
  label: string
  name?: string
  state: PlanState
  /** This plan's strengths, interests and goal. */
  prefs: PlanPrefs
}

/** A student's plans for this dataset (Plan A, Plan B…): which one is open, and adding, renaming, deleting. */
export function usePlans() {
  const { name, data } = useDataset()
  const { stored } = useProfile()

  // Nothing saved yet still counts as one plan (Plan A, the default).
  const book = computed<PlanBook>(() => books.value[name.value] ?? bookOf(defaultState(data.value)))
  const list = computed<PlanEntry[]>(() => book.value.plans.map((p) => ({ id: p.id, label: p.label, name: p.name, state: p, prefs: prefsOf(p, stored.value) })))
  const active = computed(() => activePlan(book.value)!)
  const canAdd = computed(() => book.value.plans.length < MAX_PLANS)

  function write(next: PlanBook): void {
    books.value = { ...books.value, [name.value]: next }
  }

  /**
   * A new plan, opened at once: a copy of the open one, or a fresh start that keeps the open
   * plan's answers as a starting point but asks the questions again. Either way it starts with
   * the open plan's strengths, interests and goal.
   */
  function create(mode: 'copy' | 'fresh'): void {
    const from = cloneJson(active.value)
    const body: PlanState =
      mode === 'copy'
        ? from
        : { setup: { ...from.setup, confirmed: false }, terms: standardTerms(from.setup.startYear, from.setup.startPeriod, 6), notes: [], unplaced: [] }
    // Plans from before each had its own settings get theirs written down now, so they keep them.
    const settled = { ...book.value, plans: book.value.plans.map((p) => ({ ...p, prefs: prefsOf(p, stored.value) })) }
    write(addPlan(settled, body, prefsOf(active.value, stored.value)))
  }

  // Nothing of the student's yet: one plan, questions never answered, no subjects. A shared plan
  // taken now fills it, so there's no empty Plan A left beside it.
  const blank = computed(() => {
    const only = book.value.plans.length === 1 ? active.value : undefined
    return !!only && only.setup.confirmed !== true && only.notes.length === 0 && only.terms.every((x) => x.subjects.length === 0)
  })

  /**
   * A plan someone shared, opened as a new plan; the student's other plans stay as they are (a
   * blank first plan is filled instead). Visa and study load are about the student, so the open
   * plan's are kept, as are its strengths, interests and goal. No change once there are MAX_PLANS.
   */
  function adopt(setup: PlanSetup, terms: PlanTerm[], planName?: string): void {
    if (!blank.value && !canAdd.value) return
    const { international, load } = active.value.setup
    const body: PlanState = {
      setup: { ...cloneJson(setup), confirmed: true, ...(international !== undefined ? { international } : {}), ...(load !== undefined ? { load } : {}) },
      terms: cloneJson(terms),
      notes: [],
      unplaced: [],
    }
    const settled = { ...book.value, plans: book.value.plans.map((p) => ({ ...p, prefs: prefsOf(p, stored.value) })) }
    const next = blank.value
      ? { active: active.value.id, plans: settled.plans.map((p) => ({ id: p.id, label: p.label, prefs: p.prefs, ...cloneJson(body) })) }
      : addPlan(settled, body, prefsOf(active.value, stored.value))
    write(planName ? renamePlan(next, next.active, planName) : next)
  }

  return {
    list,
    active,
    canAdd,
    blank,
    create,
    adopt,
    switchTo: (id: string) => write(switchPlan(book.value, id)),
    rename: (id: string, to: string) => write(renamePlan(book.value, id, to)),
    remove: (id: string) => write(removePlan(book.value, id)),
    /** Back to the empty start (the questions again); the shared record is untouched. */
    clear: (id: string) => write(clearPlan(book.value, id, defaultState(data.value))),
  }
}
