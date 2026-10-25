import { periodsFor } from './availability'
import { referencedSubjects } from './expr'
import type { Dataset, Subject } from './schema'
import { topicsOf } from './topics'

/** How many "often taken with" subjects are kept per subject (the page shows fewer at first). */
export const TAKEN_WITH_KEEP = 12

/** The subjects a major (or minor, specialisation) names, from every route through it. */
function componentCodes(c: Dataset['components'][number]): string[] {
  if (c.requirements === 'unknown') return []
  const lists = c.routes ? c.routes.map((r) => r.requirements) : [c.requirements]
  return [...new Set(lists.flat().flatMap((r) => ('all' in r ? r.all : r.choose.from)))]
}

const clash = (a: Subject, b: Subject) =>
  (a.nonAllowed !== 'unknown' && a.nonAllowed.includes(b.code)) || (b.nonAllowed !== 'unknown' && b.nonAllowed.includes(a.code))

const running = (s: Subject, year: number) =>
  !(s.discontinuedFrom !== undefined && year >= s.discontinuedFrom) && (s.offerings === 'unknown' || periodsFor(s, year).length > 0)

/**
 * For every subject, the ones students in the same major(s) take at the same level in the same
 * study period: ranked by how many majors they share, then by shared topics, then by code.
 * Worked out once for the whole dataset (at build), not per page: each major only pairs its own
 * subjects, so the work grows with major sizes, not with the number of subjects squared.
 */
export function buildTakenWith(data: Pick<Dataset, 'subjects' | 'components'>, year: number, keep = TAKEN_WITH_KEEP): Record<string, string[]> {
  const { subjects } = data
  const shared = new Map<string, Map<string, number>>()
  for (const c of data.components) {
    if (c.closedFrom !== undefined && year >= c.closedFrom) continue
    // The major's own subjects, and what they need first: first-year subjects are rarely named by a
    // major but are taken together to get into it (COMP10001 with MAST10006 for Computing).
    const own = componentCodes(c)
    const feeders = own.flatMap((x) => (subjects[x] ? referencedSubjects(subjects[x]!.prerequisites) : []))
    const codes = [...new Set([...own, ...feeders])].filter((x) => subjects[x] && running(subjects[x]!, year))
    for (const a of codes) {
      for (const b of codes) {
        if (a === b) continue
        const m = shared.get(a) ?? new Map<string, number>()
        m.set(b, (m.get(b) ?? 0) + 1)
        shared.set(a, m)
      }
    }
  }
  const periods = new Map<string, Set<string>>()
  const periodsOf = (s: Subject) => {
    let p = periods.get(s.code)
    if (!p) periods.set(s.code, (p = new Set(s.offerings === 'unknown' ? [] : periodsFor(s, year))))
    return p
  }
  const out: Record<string, string[]> = {}
  for (const [code, partners] of shared) {
    const self = subjects[code]!
    const own = new Set(topicsOf(self).specific)
    const mine = periodsOf(self)
    const rows: { code: string; majors: number; topics: number }[] = []
    for (const [other, majors] of partners) {
      const s = subjects[other]!
      if (s.level !== self.level || clash(self, s)) continue
      const theirs = periodsOf(s)
      // Same study period, when both say when they run.
      if (mine.size && theirs.size && ![...mine].some((p) => theirs.has(p))) continue
      rows.push({ code: other, majors, topics: topicsOf(s).specific.filter((x) => own.has(x)).length })
    }
    rows.sort((a, b) => b.majors - a.majors || b.topics - a.topics || a.code.localeCompare(b.code))
    if (rows.length) out[code] = rows.slice(0, keep).map((r) => r.code)
  }
  return out
}

/** Subject → the subjects that name it in their prerequisites, sorted by level then code. */
export function buildLeadsTo(subjects: Record<string, Subject>): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const s of Object.values(subjects)) for (const r of referencedSubjects(s.prerequisites)) (out[r] ??= []).push(s.code)
  for (const list of Object.values(out)) list.sort((a, b) => (subjects[a]?.level ?? 0) - (subjects[b]?.level ?? 0) || a.localeCompare(b))
  return out
}

export interface RelatedSubjects {
  leadsTo: string[]
  takenWith: string[]
  before: string[]
}

/**
 * The "Related subjects" block of one subject page: what it leads to, what's often taken with it,
 * and its prerequisites. Only subjects that have a page, never the subject itself, and never one
 * already linked elsewhere on the page (`shown`) or in an earlier list of this block.
 */
export function relatedSubjects(
  self: Subject,
  subjects: Record<string, Subject>,
  index: { leadsTo: Record<string, string[]>; takenWith: Record<string, string[]> },
  shown: Iterable<string> = [],
): RelatedSubjects {
  const seen = new Set([self.code, ...shown])
  const take = (codes: readonly string[]) =>
    codes.filter((c) => {
      if (!subjects[c] || seen.has(c)) return false
      seen.add(c)
      return true
    })
  const before = take(referencedSubjects(self.prerequisites))
  const leadsTo = take(index.leadsTo[self.code] ?? [])
  const takenWith = take(index.takenWith[self.code] ?? [])
  return { leadsTo, takenWith, before }
}
