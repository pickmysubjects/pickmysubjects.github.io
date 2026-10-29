import type { PlanBook, PlanPrefs, PlanState, SavedPlan } from '@/composables/planStore'
import { cloneJson } from './clone'

/**
 * Adding, renaming, switching and deleting a student's plans. Pure: each takes a book and
 * returns a new one, so the store and the tests use the same rules.
 */

/** Enough to weigh up a few options without the list getting long. */
export const MAX_PLANS = 5

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** The plan's own content, without its name or id. */
export function planBody(p: PlanState): PlanState {
  return { setup: p.setup, terms: p.terms, notes: p.notes, unplaced: p.unplaced }
}

function freshId(book: PlanBook): string {
  let id = ''
  do id = Math.random().toString(36).slice(2, 8)
  while (book.plans.some((p) => p.id === id))
  return id
}

/** The first letter no plan uses (A, B, C…). */
export function nextLabel(book: PlanBook): string {
  return [...LETTERS].find((l) => !book.plans.some((p) => p.label === l)) ?? String(book.plans.length + 1)
}

/** A book holding just this plan, as Plan A. */
export function bookOf(body: PlanState, id = 'a'): PlanBook {
  return { active: id, plans: [{ id, label: 'A', ...cloneJson(planBody(body)) }] }
}

/** Add a plan with this content and open it. No change once there are MAX_PLANS. */
export function addPlan(book: PlanBook, body: PlanState, prefs?: PlanPrefs): PlanBook {
  if (book.plans.length >= MAX_PLANS) return book
  const plan: SavedPlan = { id: freshId(book), label: nextLabel(book), ...cloneJson(planBody(body)), ...(prefs ? { prefs: cloneJson(prefs) } : {}) }
  return { active: plan.id, plans: [...book.plans, plan] }
}

export function switchPlan(book: PlanBook, id: string): PlanBook {
  return book.plans.some((p) => p.id === id) ? { ...book, active: id } : book
}

/** A blank name goes back to the plan's letter. */
export function renamePlan(book: PlanBook, id: string, name: string): PlanBook {
  const clean = name.trim().slice(0, 40)
  return {
    ...book,
    plans: book.plans.map((p) => {
      if (p.id !== id) return p
      const { name: _old, ...rest } = p
      return clean ? { ...rest, name: clean } : rest
    }),
  }
}

/** The last plan can't go; deleting the open one opens the one before it. */
export function removePlan(book: PlanBook, id: string): PlanBook {
  if (book.plans.length <= 1) return book
  const at = book.plans.findIndex((p) => p.id === id)
  if (at < 0) return book
  const plans = book.plans.filter((p) => p.id !== id)
  const active = book.active === id ? plans[Math.max(0, at - 1)]!.id : book.active
  return { active, plans }
}

/** Start a plan over: same id and letter, this empty content, no name or settings of its own. */
export function clearPlan(book: PlanBook, id: string, body: PlanState): PlanBook {
  return {
    ...book,
    plans: book.plans.map((p) => (p.id === id ? { id: p.id, label: p.label, ...cloneJson(planBody(body)) } : p)),
  }
}
