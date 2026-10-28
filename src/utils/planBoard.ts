import type { InjectionKey, Ref } from 'vue'
import {
  categoryOf,
  offeredIn,
  previewAdd,
  referencedSubjects,
  termKey,
  type CourseRule,
  type Dataset,
  type Period,
  type Plan,
  type Subject,
} from '@/engine'

/**
 * How many of each card's prerequisites (needs) and follow-ons (unlocks) are on the board, for the
 * small "← 1 · → 2" on the card. The board provides it; cards read it. `quiet` while a subject or
 * rule is selected or hovered (its lines say it then): the marks are hidden but keep their space,
 * so no card changes size when the pointer moves over the board.
 */
export const LINK_COUNTS: InjectionKey<Readonly<Ref<{ counts: ReadonlyMap<string, { needs: number; unlocks: number }>; quiet: boolean }>>> = Symbol('linkCounts')

/** A prerequisite link on the board: `from` is needed by `to`, and comes before it. */
export interface Edge {
  from: string
  to: string
}

/** Everything a subject leans on (earlier, transitively) and everything that leans on it (later). */
export function chainOf(code: string, edges: readonly Edge[]): { needs: Set<string>; unlocks: Set<string> } {
  // "needs" follows edges into the subject, "unlocks" edges out of it.
  const needs = new Set<string>()
  const unlocks = new Set<string>()
  const up = [code]
  while (up.length) {
    const c = up.shift() as string
    for (const e of edges) {
      if (e.to !== c || needs.has(e.from) || e.from === code) continue
      needs.add(e.from)
      up.push(e.from)
    }
  }
  const down = [code]
  while (down.length) {
    const c = down.shift() as string
    for (const e of edges) {
      if (e.from !== c || unlocks.has(e.to) || e.to === code) continue
      unlocks.add(e.to)
      down.push(e.to)
    }
  }
  return { needs, unlocks }
}

/**
 * Whether a planned subject can go into another term, and if not, the main reason. A term the
 * subject isn't timetabled in is allowed with a warning (a past subject is recorded where it was
 * really taken; timetables change), so `notOffered` only ever comes as `warn`.
 */
export type DropVerdict = { ok: true; warn?: 'notOffered' } | { ok: false; reason: 'same' | 'prereqLater' | 'unlocksEarlier' }

export function dropVerdict(plan: Plan, data: Dataset, code: string, from: number, to: number, load = 50): DropVerdict {
  if (from === to) return { ok: false, reason: 'same' }
  const target = plan.terms[to]
  const subject = data.subjects[code]
  if (!target) return { ok: false, reason: 'same' }
  // A subject in the plan that needs this one would now come at the same time or earlier.
  for (let i = 0; i <= to; i++) {
    const t = plan.terms[i]
    if (!t) continue
    if (t.subjects.some((c) => c !== code && referencedSubjects(data.subjects[c]?.prerequisites ?? 'none').includes(code))) {
      return { ok: false, reason: 'unlocksEarlier' }
    }
  }
  const without = { ...plan, terms: plan.terms.map((t, i) => (i === from ? { ...t, subjects: t.subjects.filter((c) => c !== code) } : t)) }
  const issues = previewAdd(without, data, to, code, load)
  if (issues.some((i) => i.kind === 'prereq-unmet' || i.kind === 'coreq-unmet')) return { ok: false, reason: 'prereqLater' }
  if (subject && offeredIn(subject, target.year, target.period).status === 'fail') return { ok: true, warn: 'notOffered' }
  return { ok: true }
}

/** Subjects offered in a term (the year's timetable, or an assumed one), for the add and swap lists. */
export function runsIn(subject: Subject, year: number, period: Period): boolean {
  return offeredIn(subject, year, period).status !== 'fail'
}

/**
 * Whether a subject can be offered for a slot in a term: counts in the degree, not planned or
 * done already, not discontinued by then, and runs then (unless `anyTerm`: a search may pick a
 * term the timetable doesn't have, with a warning, to record where a subject was really taken).
 */
export function slotEligible(s: Subject, at: { year: number; period: Period }, course: string, taken: ReadonlySet<string>, anyTerm = false): boolean {
  if (taken.has(s.code) || categoryOf(s, course) === undefined) return false
  if (s.discontinuedFrom !== undefined && at.year >= s.discontinuedFrom) return false
  return anyTerm || runsIn(s, at.year, at.period)
}

/**
 * Which subjects count towards a degree rule, for highlighting them on the board. A guide, not
 * the rule check itself: points rules by category and level, the major by the subjects it names.
 */
export function countsToward(
  rule: CourseRule,
  code: string,
  subjects: Record<string, Subject>,
  course: string,
  majorSubjects: ReadonlySet<string>,
): boolean {
  const s = subjects[code]
  if (rule.kind === 'points') {
    if (!s) return false
    if (rule.category !== undefined && categoryOf(s, course) !== rule.category) return false
    if (rule.level !== undefined && s.level !== rule.level) return false
    return true
  }
  if (rule.kind === 'major') return majorSubjects.has(code)
  if (rule.kind === 'compulsory') return rule.subjects.includes(code)
  return false
}

interface PastLike {
  terms: { year: number; period: Period; results: { code: string; failed?: boolean }[] }[]
  undated: { code: string; failed?: boolean }[]
}

/** When each subject on the board happens: done ones from My record, then planned ones (by term order). */
function boardOrder(terms: readonly { year: number; period: Period; subjects: string[] }[], past: PastLike | undefined): Map<string, number> {
  const at = new Map<string, number>()
  for (const r of past?.undated ?? []) if (!r.failed) at.set(r.code, -Infinity)
  for (const p of past?.terms ?? []) for (const r of p.results) if (!r.failed) at.set(r.code, termKey(p.year, p.period))
  for (const t of terms) for (const c of t.subjects) at.set(c, termKey(t.year, t.period))
  return at
}

/**
 * Prerequisite links on the board, earlier → later: between planned subjects, and from subjects
 * already passed (undated ones first of all).
 */
export function boardEdges(
  terms: readonly { year: number; period: Period; subjects: string[] }[],
  past: PastLike | undefined,
  subjects: Record<string, Subject>,
): Edge[] {
  const at = boardOrder(terms, past)
  const out: Edge[] = []
  for (const [code, i] of at) {
    const s = subjects[code]
    if (!s) continue
    for (const pre of referencedSubjects(s.prerequisites)) {
      const j = at.get(pre)
      if (j !== undefined && j < i) out.push({ from: pre, to: code })
    }
  }
  return out
}

/** What the chain says when nothing it needs is in the plan: "no prerequisites" when it has none at all. */
export function chainNoneKey(prerequisites: unknown): string {
  return prerequisites === 'none' ? 'browse.noPrereq' : 'plan.tlNone'
}
